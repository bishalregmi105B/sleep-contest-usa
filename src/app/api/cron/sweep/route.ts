import { NextResponse, connection } from 'next/server';
import { env, isProduction } from '@/lib/env';
import { log } from '@/lib/logger';
import { drainOutbox, outboxHealth } from '@/lib/outbox';
import { expireStaleHolds, reconcile } from '@/lib/capacity';


/**
 * GET /api/cron/sweep
 *
 * The sweeper. One endpoint, four jobs:
 *
 *   1. drain due email outbox rows
 *   2. expire stale holds and release their capacity
 *   3. reconcile the denormalised counters against the registrations table
 *   4. purge long-expired unpaid registrations (personal-data retention)
 *
 * ## Every job here is idempotent
 *
 * Cron delivery is best effort. Vercel can fire a schedule twice, or late, or
 * skip it entirely. So:
 *
 *  - outbox rows are claimed with `FOR UPDATE SKIP LOCKED`, so two sweepers take
 *    disjoint rows and cannot double-send;
 *  - hold expiry only matches rows still `pending`, and releases exactly the
 *    number of rows it expired;
 *  - reconciliation recomputes from the source of truth rather than adjusting by
 *    a delta, so running it twice is a no-op;
 *  - retention deletes rows that are already expired and unpaid, so deleting
 *    twice changes nothing.
 *
 * Scheduling: every minute on Vercel Pro via `vercel.json`. On Hobby, cron runs
 * at most once a day — see DEPLOY.md, which is why nothing here assumes a
 * per-minute schedule.
 */
export async function GET(request: Request) {
  await connection();

  // Vercel sends `Authorization: Bearer <CRON_SECRET>`. Compared with a plain
  // string equality on a random secret; a timing attack on a 32+ character
  // secret over a rate-limited admin route is not the threat model here, and
  // this endpoint can only do idempotent work.
  const authorization = request.headers.get('authorization');
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ message: 'Not authorised.' }, { status: 401 });
  }

  const started = Date.now();
  const result: Record<string, unknown> = {};

  try {
    result.outbox = await drainOutbox(50);
  } catch (err) {
    result.outbox = { error: err instanceof Error ? err.message : 'unknown' };
    log.error('sweep: outbox drain failed');
  }

  try {
    result.holds = await expireStaleHolds();
  } catch (err) {
    result.holds = { error: err instanceof Error ? err.message : 'unknown' };
    log.error('sweep: hold expiry failed');
  }

  // Reconciliation is the more expensive job, so it runs on a coarser cadence
  // than the per-minute sweep. Cheap enough to skip most runs.
  if (shouldReconcile()) {
    try {
      result.reconciled = await reconcile();
    } catch (err) {
      result.reconciled = { error: err instanceof Error ? err.message : 'unknown' };
      log.error('sweep: reconcile failed');
    }
  }

  try {
    result.retention = await purgeIfDue();
  } catch (err) {
    result.retention = { error: err instanceof Error ? err.message : 'unknown' };
  }

  result.durationMs = Date.now() - started;
  result.outboxHealth = await outboxHealth().catch(() => null);

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Reconcile at most every five minutes.
 *
 * Keyed on the wall-clock minute so the decision needs no shared state: every
 * instance computes the same answer, and repeated cron delivery inside the same
 * window is a no-op.
 */
function shouldReconcile(): boolean {
  const now = new Date();
  return now.getUTCSeconds() < 30 && now.getUTCMinutes() % 5 === 0;
}

/** Retention once an hour, for the same reason. */
async function purgeIfDue(): Promise<number | { skipped: true }> {
  const now = new Date();
  if (now.getUTCMinutes() !== 0 || now.getUTCSeconds() >= 30) return { skipped: true };
  const { purgeStaleRegistrations } = await import('@/lib/capacity');
  const removed = await purgeStaleRegistrations(7);
  if (removed > 0) log.info('sweep: purged expired registrations', { removed });
  return removed;
}

export { isProduction };
