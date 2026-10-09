import { fallbackKV, withKV } from './kv';
import { drainOutbox } from './outbox';
import { expireStaleHolds } from './capacity';
import { log } from './logger';

/**
 * Opportunistic background work.
 *
 * ## Why this exists
 *
 * The project is on Vercel's **Hobby** plan, which rejects a per-minute cron
 * outright:
 *
 *   Error: Hobby accounts are limited to daily cron jobs.
 *
 * The work that cron would do is not optional. Without it:
 *
 *   - confirmation emails queue in the outbox and never send, and
 *   - a hold that is never expired permanently consumes capacity, so the cap
 *     drifts down until registration refuses everyone.
 *
 * So rather than ship a site whose background jobs silently never run, the work
 * is also triggered by ordinary traffic.
 *
 * ## How it is safe to do this
 *
 * **Every job it runs is already idempotent**, which is what makes calling them
 * from a request path acceptable rather than reckless:
 *
 *   - outbox rows are claimed with `FOR UPDATE SKIP LOCKED`, so two drainers take
 *     disjoint rows and cannot double-send;
 *   - hold expiry only matches rows still `pending` and releases exactly the
 *     number it expired, so an overlapping run cannot double-release;
 *   - reconciliation recomputes from the registrations table rather than
 *     adjusting a delta, so running it twice changes nothing.
 *
 * **It is rate limited to once a minute** by a Redis lock, so a traffic spike
 * does not turn every registration into a sweeper invocation. The cost is one
 * Redis round trip per write.
 *
 * **It is fire-and-forget.** The work happens after the response is sent, never
 * inside the request the visitor is waiting on.
 *
 * ## What this is not
 *
 * A replacement for a real scheduler. A cron guarantees a tick when traffic is
 * zero; this cannot. On a quiet site, outbox work waits for the next visitor.
 * That is acceptable for a contest that has traffic, and it is why DEPLOY.md
 * still asks for Pro, or an external scheduler, before launch.
 */

const TICK_LOCK = 'lock:tick';
const TICK_INTERVAL_MS = 60_000;

let lastLocalTick = 0;

/**
 * Runs background work if it is due, without blocking or failing the caller.
 *
 * Never throws: a failure here must not turn a successful registration into an
 * error, and the cron path still exists for when there is a scheduler.
 */
export function tickSoon(reason: string): void {
  if (process.env.NODE_ENV === 'test') return;

  // A cheap local guard, so a burst on one instance does not even reach Redis.
  const now = Date.now();
  if (now - lastLocalTick < TICK_INTERVAL_MS) return;

  void (async () => {
    try {
      const acquired = await withKV(
        (kv) => kv.acquire(TICK_LOCK, TICK_INTERVAL_MS),
        () => fallbackKV.acquire(TICK_LOCK, TICK_INTERVAL_MS),
      );
      if (!acquired) return;

      lastLocalTick = now;
      const outbox = await drainOutbox(50);
      const holds = await expireStaleHolds();

      if (outbox.sent > 0 || holds.expired > 0) {
        log.info('background tick', { reason, ...outbox, ...holds });
      }
    } catch (err) {
      log.warn('background tick failed', {
        reason,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  })();
}
