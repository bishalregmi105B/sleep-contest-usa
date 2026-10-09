import type { PrismaClient } from '@prisma/client';
import { assertServerConfigured, env } from './env';

/**
 * Prisma client, PostgreSQL only.
 *
 * The previous version chose between SQLite and Postgres at runtime and fell
 * back to a file the platform did not persist. Both of those are gone: a site
 * that takes money cannot have a storage backend that depends on which host it
 * landed on.
 *
 * Three things matter here and are easy to get wrong:
 *
 *  1. **One client per process.** `pg` pools connections. Constructing a second
 *     client per request is how a serverless deployment exhausts its database
 *     connections under a spike.
 *  2. **Pool sizing comes from the URL.** Serverless hosts need
 *     `connection_limit=1` on the pooled string; a long-running container wants
 *     more. We pass the URL through untouched so the provider's own pooled URL
 *     governs, and only add a conservative default if the operator set none.
 *  3. **Lazy construction.** Building the client at module scope meant one
 *     misconfiguration took down every route that transitively imported this
 *     file, including `next build`.
 */

let client: PrismaClient | undefined;
let creating: Promise<PrismaClient> | undefined;

/** Memoised on globalThis so dev hot-reloads do not open a new pool each save. */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

/**
 * Adds a pool limit if the URL has none.
 *
 * Applied only in production. In development a single connection is fine and in
 * tests it actively breaks parallel test setup, so `DATABASE_URL` is respected
 * verbatim there.
 */
function withPoolLimit(url: string): string {
  if (process.env.NODE_ENV !== 'production') return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=1`;
}

async function createClient(): Promise<PrismaClient> {
  assertServerConfigured();

  if (!env.databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Start the database (docker compose up -d) or copy .env.example to .env.local.',
    );
  }

  const { PrismaClient: Client } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');

  return new Client({
    adapter: new PrismaPg({ connectionString: withPoolLimit(env.databaseUrl) }),
  });
}

/**
 * The client, created on first use and then reused.
 *
 * The `creating` promise closes a race the plain `if (client)` check leaves
 * open: under a cold-start burst, every concurrent request would otherwise see
 * an undefined client and each build its own pool.
 */
export async function getDb(): Promise<PrismaClient> {
  if (client) return client;
  if (creating) return creating;

  creating = (async () => {
    const existing = globalForPrisma.__prisma;
    if (existing) {
      client = existing;
      return existing;
    }
    const created = await createClient();
    client = created;
    // In production the module scope is per-instance anyway; the global is for
    // dev reloads only.
    if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = created;
    return created;
  })().finally(() => {
    creating = undefined;
  });

  return creating;
}

/**
 * The client, for the common case.
 *
 * Throws if a query is attempted before initialisation, which is a programming
 * error rather than a runtime condition.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (!client) {
      throw new Error('Database client used before initialisation. Await getDb() first.');
    }
    return Reflect.get(client, property);
  },
});

/**
 * True when the database answers. Used by /api/ready.
 *
 * `SELECT 1` rather than a table query on purpose: readiness is about the
 * connection, not about the schema. A missing table is a migration problem,
 * which /api/health reports separately.
 */
export async function pingDatabase(timeoutMs = 2_000): Promise<boolean> {
  try {
    const client = await withTimeout(getDb(), timeoutMs);
    await withTimeout(client.$queryRaw`SELECT 1`, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Prisma error code to a plain-language message.
 *
 * Used so a route can distinguish "this email is already registered" from "the
 * database is unreachable" without leaking driver internals to a visitor.
 */
export function prismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}