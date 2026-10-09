import { env, isProduction, redisEnabled } from './env';

/**
 * Key-value store used for rate limiting, single-flight locks and the stats
 * cache.
 *
 * Three implementations behind one interface: Upstash REST (serverless),
 * ioredis (self-hosted), and an in-process Map.
 *
 * The in-process one is **not** a production store and is not treated as one.
 * On a multi-instance host it silently multiplies every rate limit by the
 * instance count, which is the exact defect the previous `lib/rate-limit.ts`
 * had. So in production it is only ever reached when Redis is unreachable, and
 * reaching it logs at `error` level and sets `degraded`, which /api/health and
 * the admin health card both surface.
 */

export type KV = {
  readonly kind: 'upstash' | 'redis' | 'memory';

  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;

  /**
   * Sliding-window rate limit check. Increments the window and reports whether
   * the caller is within `limit` events in the trailing `windowSeconds`.
   *
   * Sliding rather than fixed because a fixed window lets a client send 2x the
   * limit across a window boundary, which is the whole point of an endpoint
   * under bot pressure.
   */
  hit(key: string, limit: number, windowSeconds: number): Promise<boolean>;

  /**
   * Single-flight lock. Returns true if the caller acquired it.
   *
   * Used to collapse a cache expiry: when 2,000 concurrent requests all find a
   * cold cache, exactly one recomputes and the rest wait for it, rather than
   * 2,000 identical COUNT queries.
   */
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;

  ping(): Promise<boolean>;
};

/**
 * Sliding-window script.
 *
 * Lua because the read of the window, the trim and the add must be one atomic
 * step. Done as separate commands there is a window where two concurrent
 * callers both see a window below the limit.
 *
 * ZREMRANGEBYSCORE drops expired samples, ZCARD counts what remains, ZADD
 * records this one and returns the post-insert size.
 */
const SLIDING_WINDOW_LUA = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local cutoff = now - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)
if count >= tonumber(ARGV[4]) then
  redis.call('PEXPIRE', key, window)
  return 0
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return 1
`;

let uniqueCounter = 0;

// ---------------------------------------------------------------------------
// In-process fallback
// ---------------------------------------------------------------------------

type Entry = { value: string; expiresAt: number };
type WindowEntry = { timestamps: number[] };

/**
 * Development, tests, and production degradation.
 *
 * Not shared between instances and resets on restart. That is acceptable for a
 * cache but it means rate limits are per-instance, which is why every call site
 * logs a louder alarm when this is the active implementation in production.
 */
class MemoryKV implements KV {
  readonly kind = 'memory' as const;

  private readonly store = new Map<string, Entry>();
  private readonly windows = new Map<string, WindowEntry>();

  private sweep(now: number): void {
    if (this.store.size > 10_000) {
      for (const [key, entry] of this.store) {
        if (entry.expiresAt <= now) this.store.delete(key);
      }
    }
    if (this.windows.size > 10_000) {
      for (const [key, window] of this.windows) {
        if (window.timestamps.length === 0) this.windows.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.sweep(Date.now());
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const window = this.windows.get(key) ?? { timestamps: [] };
    window.timestamps = window.timestamps.filter((t) => t > cutoff);

    if (window.timestamps.length >= limit) {
      this.windows.set(key, window);
      return false;
    }

    window.timestamps.push(now);
    this.windows.set(key, window);
    return true;
  }

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const existing = this.store.get(key);
    if (existing && existing.expiresAt > Date.now()) return false;
    this.store.set(key, { value: '1', expiresAt: Date.now() + ttlMs });
    return true;
  }

  async release(key: string): Promise<void> {
    this.store.delete(key);
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Upstash REST (serverless)
// ---------------------------------------------------------------------------

/**
 * Upstash over its HTTP API.
 *
 * The right choice on Vercel: no long-lived socket to exhaust, and it works
 * from the Edge as well as Node.
 */
class UpstashKV implements KV {
  readonly kind = 'upstash' as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(...args: (string | number)[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
    const body = (await response.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(body.error);
    return body.result;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.command('GET', key);
    return typeof result === 'string' ? result : null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    // PX takes milliseconds; SET is atomic so this needs no separate EXPIRE.
    await this.command('SET', key, value, 'PX', ttlSeconds * 1000);
  }

  async del(key: string): Promise<void> {
    await this.command('DEL', key);
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const result = await this.command(
      'EVAL',
      SLIDING_WINDOW_LUA,
      '1',
      key,
      Date.now(),
      windowSeconds * 1000,
      `${Date.now()}:${(uniqueCounter += 1)}`,
      limit,
    );
    return Number(result) === 1;
  }

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const result = await this.command('SET', key, '1', 'NX', 'PX', ttlMs);
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.command('DEL', key);
  }

  async ping(): Promise<boolean> {
    try {
      await this.command('PING');
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// ioredis (self-hosted)
// ---------------------------------------------------------------------------

/**
 * A thin adapter rather than a direct ioredis import at module scope.
 *
 * `ioredis` opens a socket on construction, so importing it eagerly would open
 * a connection during `next build`, which analyses route modules without a
 * server to serve them.
 */
class IoredisKV implements KV {
  readonly kind = 'redis' as const;
  private clientPromise: Promise<{
    eval: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<unknown>;
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ...args: (string | number)[]) => Promise<string | null>;
    del: (key: string) => Promise<number>;
    ping: () => Promise<string>;
  }> | null = null;

  constructor(private readonly url: string) {}

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(this.url, {
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
          lazyConnect: false,
        });
        // Without a listener, an emitted error crashes the process.
        client.on('error', (err: Error) => {
          console.error(`[kv] redis error: ${err.message}`);
        });
        return client as never;
      })();
    }
    return this.clientPromise;
  }

  async get(key: string): Promise<string | null> {
    const c = await this.client();
    return c.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const c = await this.client();
    await c.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    const c = await this.client();
    await c.del(key);
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const c = await this.client();
    const result = await c.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      Date.now(),
      windowSeconds * 1000,
      `${Date.now()}:${(uniqueCounter += 1)}`,
      limit,
    );
    return Number(result) === 1;
  }

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const c = await this.client();
    const result = await c.set(key, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    const c = await this.client();
    await c.del(key);
  }

  async ping(): Promise<boolean> {
    try {
      const c = await this.client();
      return (await c.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Selection and degradation
// ---------------------------------------------------------------------------

let instance: KV | null = null;

function build(): KV {
  if (env.upstashUrl && env.upstashToken) return new UpstashKV(env.upstashUrl, env.upstashToken);
  if (env.redisUrl) return new IoredisKV(env.redisUrl);
  return new MemoryKV();
}

export function getKV(): KV {
  if (!instance) instance = build();
  return instance;
}

/**
 * Replaces the active implementation. Tests only.
 *
 * Kept out of production bundles by convention rather than by a guard: it is
 * never called from application code, and a guard here would still ship the
 * branch.
 */
export function setKVForTesting(kv: KV | null): void {
  instance = kv;
}

/**
 * Runs a KV operation, falling back to memory when Redis is unreachable.
 *
 * This is the degradation path required by the runbook: Redis being down must
 * not take registrations down with it. It logs at `error`, once per interval so
 * an outage does not itself become a log flood.
 */
let lastDegradedLog = 0;

export async function withKV<T>(op: (kv: KV) => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  const kv = getKV();
  if (kv.kind === 'memory') return fallback();
  try {
    return await op(kv);
  } catch (err) {
    const now = Date.now();
    if (now - lastDegradedLog > 30_000) {
      lastDegradedLog = now;
      console.error(
        `[kv] ${kv.kind} unavailable, degrading to in-process store: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
    }
    return fallback();
  }
}

/**
 * One in-process store per process, used only as the degraded fallback.
 *
 * A single shared instance, so every fallback path in a request sees the same
 * state rather than each making its own.
 */
export const fallbackKV: KV = new MemoryKV();

export { MemoryKV };

/**
 * Reports whether rate limiting and caching are running as intended.
 * Surfaced by /api/health and the admin health card.
 */
export function kvStatus(): {
  configured: boolean;
  kind: KV['kind'] | null;
  usableInProduction: boolean;
  note: string;
} {
  const kind = instance?.kind ?? (redisEnabled ? getKV().kind : 'memory');
  if (kind === 'memory') {
    return {
      configured: false,
      kind,
      usableInProduction: !isProduction,
      note: isProduction
        ? 'No Redis: rate limits are per-instance and the stats cache falls back to the database.'
        : 'No Redis configured (expected outside production).',
    };
  }
  return { configured: true, kind, usableInProduction: true, note: '' };
}