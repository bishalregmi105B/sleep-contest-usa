import { NextResponse, connection } from 'next/server';
import { paidCount as readPaidCount, currentReserved } from '@/lib/capacity';
import { getProgress } from '@/lib/progress';
import { getSettings } from '@/lib/settings';
import { fallbackKV, getKV, withKV } from '@/lib/kv';


/**
 * Cached for 15 seconds at the CDN, and for the same window in Redis.
 *
 * The CDN header is the one that actually absorbs the spike: 2,000 rps of this
 * endpoint is served from the edge, and the origin sees a small fraction of it.
 */
const CDN_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';

const REDIS_TTL_SECONDS = 15;
/** Bound on how long a request waits for the lock holder to fill the cache. */
const LOCK_WAIT_MS = 2_000;
const LOCK_POLL_MS = 50;

/**
 * Jitter on the TTL.
 *
 * Without it, every region's cache entry expires at the same instant, and the
 * expiry becomes a synchronized origin stampede rather than a smooth trickle.
 */
const TTL_JITTER_SECONDS = 5;

const CACHE_KEY = 'stats:v1';

/**
 * GET /api/stats
 *
 * The counter. Budget: p95 under 50 ms at 2,000 rps, and at most one database
 * query per 15 seconds per region.
 *
 * Three layers, in order:
 *
 *  1. **CDN.** `s-maxage=15` means the edge answers the overwhelming majority
 *     of requests without the origin being involved at all.
 *  2. **Redis.** Catches requests that reach the origin. 15-second TTL with
 *     jitter, so a cold key is rare and expiry is not synchronized.
 *  3. **Single-flight lock.** The case layer 1 and 2 are designed to prevent but
 *     cannot fully: right after an expiry, 2,000 concurrent requests all find a
 *     cold cache. Without a lock, all 2,000 recompute. With it, exactly one
 *     queries and the rest wait for that result.
 *
 * The count itself reads the denormalised `Counter.paid` row, which is O(1). A
 * COUNT(*) over the registrations table was measured at 12–28 ms on 200,000
 * rows, which would not survive 2,000 rps.
 */
export async function GET() {
  // Never prerendered: see the note above.
  await connection();

  const cached = await withKV(
    async (kv) => {
      const value = await kv.get(CACHE_KEY);
      return value;
    },
    async () => fallbackKV.get(CACHE_KEY),
  );

  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: { 'Cache-Control': CDN_CACHE_CONTROL },
    });
  }

  // Single-flight. Whoever gets the lock computes; everyone else polls briefly.
  const acquired = await withKV(
    (kv) => kv.acquire(`lock:${CACHE_KEY}`, LOCK_WAIT_MS),
    () => fallbackKV.acquire(`lock:${CACHE_KEY}`, LOCK_WAIT_MS),
  );

  if (!acquired) {
    const filled = await waitForCache();
    if (filled) {
      return NextResponse.json(filled, { headers: { 'Cache-Control': CDN_CACHE_CONTROL } });
    }
    // The lock holder failed or is very slow. Compute anyway rather than fail
    // the request; a slightly slower answer beats no answer.
  } else {
    try {
      const payload = await compute();
      const ttl = REDIS_TTL_SECONDS + Math.floor(Math.random() * TTL_JITTER_SECONDS);
      await withKV(
        (kv) => kv.set(CACHE_KEY, JSON.stringify(payload), ttl),
        () => fallbackKV.set(CACHE_KEY, JSON.stringify(payload), ttl),
      );
      return NextResponse.json(payload, { headers: { 'Cache-Control': CDN_CACHE_CONTROL } });
    } finally {
      await withKV(
        (kv) => kv.release(`lock:${CACHE_KEY}`),
        () => fallbackKV.release(`lock:${CACHE_KEY}`),
      );
    }
  }

  const payload = await compute();
  return NextResponse.json(payload, { headers: { 'Cache-Control': CDN_CACHE_CONTROL } });
}

/** Polls the cache for the value the lock holder is about to write. */
async function waitForCache(): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    const value = await withKV((kv) => kv.get(CACHE_KEY), () => fallbackKV.get(CACHE_KEY));
    if (value) return JSON.parse(value) as Record<string, unknown>;
  }
  return null;
}

export type StatsPayload = {
  count: number;
  reserved: number;
  goal: number;
  currentMilestone: number | null;
  milestoneIndex: number | null;
  progress: ReturnType<typeof getProgress>;
  registrationOpen: boolean;
  maxRegistrations: number;
  updatedAt: string;
};

async function compute(): Promise<StatsPayload> {
  const settings = await getSettings();
  const count = await readPaidCount();
  const reserved = await currentReserved();

  return {
    count,
    reserved,
    goal: settings.goal,
    ...progressFields(count, settings.milestones, settings.goal, settings.counterMinPublic),
    registrationOpen: settings.registrationOpen,
    maxRegistrations: settings.maxRegistrations,
    updatedAt: new Date().toISOString(),
  };
}

function progressFields(
  count: number,
  milestones: readonly number[],
  goal: number,
  counterMinPublic: number,
) {
  const progress = getProgress({ paidCount: count, milestones, goal, counterMinPublic });
  return {
    currentMilestone: progress.kind === 'progress' ? progress.currentMilestone : null,
    milestoneIndex: progress.kind === 'progress' ? progress.milestoneIndex : null,
    progress,
  };
}

/** Drops the cached stats. Called when a setting changes the display. */
export async function invalidateStats(): Promise<void> {
  await withKV((kv) => kv.del(CACHE_KEY), () => fallbackKV.del(CACHE_KEY));
}

export { getKV };