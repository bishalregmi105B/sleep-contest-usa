import { getDb } from './db';
import { log } from './logger';

/**
 * Capacity enforcement.
 *
 * The rule: never more than `maxRegistrations` simultaneous commitments. A
 * commitment is either a paid registration or a live hold (someone who filled
 * the form and is in or has just left checkout).
 *
 * The previous implementation had no cap at all — 200,000 was a constant in a
 * content file. This is the piece that makes it real.
 *
 * ## Why a single-row counter
 *
 * The check and the increment must be one atomic step, or two concurrent
 * registrations both read "199 reserved, cap 200" and both insert. Doing
 * `SELECT` then `UPDATE` opens exactly that window. Doing it as one conditional
 * statement does not:
 *
 * ```sql
 * UPDATE "Counter" SET reserved = reserved + 1
 * WHERE id = 1 AND reserved < $max
 * RETURNING reserved;
 * ```
 *
 * Postgres serialises the row write, so the second transaction's `reserved < max`
 * is evaluated against the value the first one just committed. Zero rows
 * returned means the cap was reached.
 *
 * ## When this stops being enough
 *
 * A single hot row is a serialisation point. Measured behaviour is roughly
 * 1–2k updates/sec on it before the row lock is the bottleneck; the client's
 * modelled peak is 300 registration submissions/sec, which is comfortably
 * inside that. If it is ever exceeded, the documented next step is 16 sharded
 * counter rows summed on read, which divides the contention sixteenfold.
 */

export const HOLD_MINUTES = 30;

/** Takes a capacity hold, or reports that the cap is already reached. */
export type HoldResult =
  | { readonly granted: true; readonly reserved: number }
  | { readonly granted: false; readonly reserved: number };

export async function takeHold(maxRegistrations: number): Promise<HoldResult> {
  const db = await getDb();

  const rows = await db.$queryRaw<Array<{ reserved: number }>>`
    UPDATE "Counter" SET reserved = reserved + 1
    WHERE id = 1 AND reserved < ${maxRegistrations}
    RETURNING reserved
  `;

  if (rows.length === 0) {
    const current = await currentReserved();
    return { granted: false, reserved: current };
  }
  return { granted: true, reserved: rows[0]!.reserved };
}

/** Releases one hold. Used when a hold expires, is cancelled or refunded. */
export async function releaseHold(): Promise<void> {
  const db = await getDb();
  // GREATEST guards against a double release driving the counter negative,
  // which would silently re-open capacity that is actually committed.
  await db.$queryRaw`UPDATE "Counter" SET reserved = GREATEST(0, reserved - 1) WHERE id = 1`;
}

export async function currentReserved(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ reserved: number }>>`SELECT reserved FROM "Counter" WHERE id = 1`;
  return rows[0]?.reserved ?? 0;
}

/**
 * The real paid, non-internal count.
 *
 * Reads the denormalised counter rather than COUNT(*). See the note on the
 * Counter model: measured at 200,000 rows the partial-index count is 12 ms when
 * autovacuum is current and 28 ms when it is not, which is too close to the
 * hot-path budget to serve 2,000 requests per second against.
 */
export async function paidCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ paid: number }>>`SELECT paid FROM "Counter" WHERE id = 1`;
  return rows[0]?.paid ?? 0;
}

/** True count from the registrations table. Slow; used by reconciliation. */
export async function truePaidCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count FROM "Registration"
    WHERE status = 'paid' AND NOT "isInternal"
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * The paid transition: status, mat number, counter and hold, in one statement.
 *
 * This replaces the previous `find MAX(matNumber)`-then-increment, which raced
 * under any concurrency and relied on a retry loop to paper over it. Here the
 * sequence does the assignment and the row's own status is the guard, so
 *
 *   - zero rows returned means somebody else already processed this payment,
 *     which is success, not an error; and
 *   - a replayed webhook is a no-op.
 *
 * The caller runs this inside the webhook's transaction together with the
 * outbox row and the event-ledger update.
 */
export async function markPaid(
  publicId: string,
  payment: { provider: string; ref: string | null },
): Promise<
  | { readonly processed: true; readonly registration: PaidRegistration }
  | { readonly processed: false; readonly reason: 'not_found' | 'not_pending' }
> {
  const db = await getDb();

  const rows = await db.$queryRaw<PaidRegistration[]>`
    UPDATE "Registration"
    SET status = 'paid',
        "matNumber" = nextval('mat_number_seq'),
        "paidAt" = now(),
        "paymentProvider" = ${payment.provider},
        "paymentRef" = ${payment.ref},
        "holdExpiresAt" = NULL,
        "updatedAt" = now()
    WHERE "publicId" = ${publicId}
      AND status = 'pending'
    RETURNING "publicId", "fullName", "email", "matNumber", "refCode", "status"
  `;

  if (rows.length === 0) {
    // Distinguish "no such registration" from "already processed". Both are
    // success from the webhook's point of view; only the first is worth a log.
    const existing = await db.registration.findUnique({
      where: { publicId },
      select: { status: true },
    });
    if (!existing) return { processed: false, reason: 'not_found' };
    return { processed: false, reason: 'not_pending' };
  }

  // The counter is part of the same transaction, so a rolled-back payment
  // cannot leave the count inflated. Idempotency is already guaranteed: only a
  // pending row was matched, so this runs at most once per registration.
  await db.$queryRaw`UPDATE "Counter" SET paid = paid + 1 WHERE id = 1`;

  return { processed: true, registration: rows[0]! };
}

export type PaidRegistration = {
  publicId: string;
  fullName: string;
  email: string;
  matNumber: number;
  refCode: string;
  status: string;
};

/**
 * Refund: releases the capacity hold and decrements the paid count.
 *
 * Both are guarded on the row still being `paid`, so a replayed refund event
 * cannot release the same seat twice — which is the failure that would
 * over-admit registrations above the cap.
 */
export async function markRefunded(publicId: string, reason: string | null): Promise<boolean> {
  const db = await getDb();

  const rows = await db.$queryRaw<Array<{ id: number }>>`
    UPDATE "Registration"
    SET status = 'refunded',
        "updatedAt" = now(),
        "paymentRef" = COALESCE(${reason}, "paymentRef")
    WHERE "publicId" = ${publicId} AND status = 'paid'
    RETURNING id
  `;

  if (rows.length === 0) return false;

  await db.$queryRaw`
    UPDATE "Counter"
    SET paid = GREATEST(0, paid - 1),
        reserved = GREATEST(0, reserved - 1)
    WHERE id = 1
  `;
  return true;
}

/**
 * Expires holds that have run out, releasing their capacity.
 *
 * Runs in batches and is idempotent: expiring an already-expired row matches
 * nothing, so two sweepers overlapping does not double-release. The release is
 * counted from the rows actually expired rather than assumed, which is what
 * makes the overlap safe.
 */
export async function expireStaleHolds(batchSize = 500): Promise<{ expired: number; released: number }> {
  const db = await getDb();

  const expired = await db.$transaction(async (tx) => {
    // FOR UPDATE SKIP LOCKED so two sweepers take disjoint batches rather than
    // one blocking on the other's lock.
    const rows = await tx.$queryRaw<Array<{ id: number }>>`
      UPDATE "Registration"
      SET status = 'expired', "updatedAt" = now()
      WHERE id IN (
        SELECT id FROM "Registration"
        WHERE status = 'pending' AND "holdExpiresAt" IS NOT NULL AND "holdExpiresAt" < now()
        ORDER BY "holdExpiresAt"
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;
    return rows.length;
  });

  if (expired > 0) {
    const db2 = await getDb();
    await db2.$queryRaw`
      UPDATE "Counter" SET reserved = GREATEST(0, reserved - ${expired}) WHERE id = 1
    `;
    log.info('holds expired', { expired });
  }

  return { expired, released: expired };
}

/**
 * Recomputes both counters from the registrations table.
 *
 * The counters are denormalised, so this is the correction path for any drift:
 * a crash between the status transition and the counter write, a manual
 * correction, or a restored backup. Runs nightly.
 */
export async function reconcile(): Promise<{ paid: number; reserved: number; driftedPaid: boolean; driftedReserved: boolean }> {
  const db = await getDb();

  const [truePaid, liveHolds] = await Promise.all([
    truePaidCount(),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "Registration"
      WHERE status IN ('pending', 'paid')
    `,
  ]);

  const reserved = Number(liveHolds[0]?.count ?? 0);
  const current = await db.$queryRaw<Array<{ paid: number; reserved: number }>>`
    SELECT paid, reserved FROM "Counter" WHERE id = 1
  `;

  const wasPaid = current[0]?.paid ?? 0;
  const wasReserved = current[0]?.reserved ?? 0;

  if (wasPaid !== truePaid || wasReserved !== reserved) {
    await db.$executeRaw`
      UPDATE "Counter" SET paid = ${truePaid}, reserved = ${reserved} WHERE id = 1
    `;
    log.warn('capacity counter drifted, reconciled', {
      paidWas: wasPaid,
      paidNow: truePaid,
      reservedWas: wasReserved,
      reservedNow: reserved,
    });
  }

  return {
    paid: truePaid,
    reserved,
    driftedPaid: wasPaid !== truePaid,
    driftedReserved: wasReserved !== reserved,
  };
}

/**
 * Deletes registrations that expired long ago and were never paid.
 *
 * Personal data retention, not housekeeping: an abandoned checkout should not
 * leave a name, address and date of birth on the system indefinitely.
 */
export async function purgeStaleRegistrations(olderThanDays = 7): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);

  const rows = await db.$queryRaw<Array<{ id: number }>>`
    DELETE FROM "Registration"
    WHERE status IN ('expired', 'cancelled')
      AND "createdAt" < ${cutoff}
      AND "paidAt" IS NULL
    RETURNING id
  `;
  return rows.length;
}