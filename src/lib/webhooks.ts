import type Stripe from 'stripe';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prismaErrorCode } from './db';
import { log } from './logger';
import { enqueue } from './outbox';

/**
 * Stripe webhook event processing.
 *
 * Lives in `lib/` rather than in the route so the concurrency tests can drive
 * the real handler. A test that re-implements this logic to exercise it proves
 * only that the copy behaves correctly, which is the "structural checks pass
 * while the flow is broken" failure mode.
 *
 * ## Exactly once
 *
 * Stripe retries a webhook for up to three days until it gets a 2xx, and sends
 * duplicates and out-of-order events routinely. The guarantees, in order:
 *
 *  1. The event id is inserted into `WebhookEvent` first, in the same
 *     transaction as the state change. A duplicate hits the primary key and
 *     aborts the transaction, so the work is never repeated. It is acknowledged
 *     200, because a duplicate is a success — anything else makes Stripe keep
 *     retrying it forever.
 *  2. The paid transition is guarded on `status = 'pending'`, so it applies at
 *     most once per registration even if the ledger were lost.
 *  3. The confirmation is an outbox row keyed on registration and mat number, so
 *     even a duplicated row cannot send twice.
 */
export type EventOutcome = 'processed' | 'duplicate' | 'ignored';


export async function processEvent(db: PrismaClient, event: Stripe.Event): Promise<EventOutcome> {
  /**
   * Fast path, before any transaction is opened.
   *
   * A Prisma interactive transaction holds a pool connection for its whole
   * duration, so opening one per duplicate is expensive. Under a retry burst —
   * Stripe delivering the same event many times, or a whole batch redelivered
   * after a deploy — nearly every delivery is a duplicate, and paying a
   * connection plus a unique-index wait for each of them is how a webhook burst
   * exhausts the pool and starts returning 500 to Stripe.
   *
   * This is an optimisation, not the guarantee: the insert inside the
   * transaction below is still the authoritative check, because a check and an
   * insert cannot be made atomic without the transaction. Losing this race just
   * means falling through to the exact path.
   */
  const seen = await db.webhookEvent.findUnique({ where: { id: event.id }, select: { id: true } });
  if (seen) return 'duplicate';

  // `maxWait` bounds how long this request queues for a connection.
  //
  // A Prisma interactive transaction holds a connection for its whole duration,
  // so N concurrent webhooks need N connections. Under a payment burst the
  // pool runs dry, and with the 5-second default `maxWait` the surplus requests
  // fail with "Unable to start a transaction in the given time" — which returns
  // 500 to Stripe, which retries, which makes the queue longer.
  //
  // Queueing for a connection instead is the correct behaviour: the work is
  // idempotent and cheap (one insert, possibly one update), so a few seconds of
  // queueing is far better than dropping a payment event.
  return db.$transaction(async (tx) => {
    // The ledger insert is the idempotency gate. A duplicate event id raises a
    // unique violation and rolls the whole transaction back, so nothing after
    // this line runs twice.
    try {
      await tx.webhookEvent.create({
        data: { id: event.id, type: event.type, status: 'received' },
      });
    } catch (err) {
      if (prismaErrorCode(err) === 'P2002') return 'duplicate';
      throw err;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCompleted(tx, event.data.object);
        break;
      case 'checkout.session.async_payment_succeeded':
        // Delayed payment methods: the same transition, one event type later.
        await handleCompleted(tx, event.data.object);
        break;
      case 'checkout.session.expired':
        await handleExpired(tx, event.data.object);
        break;
      case 'charge.refunded':
      case 'refund.created':
        await handleRefund(tx, event);
        break;
      default:
        // Acknowledged and ignored. Stripe sends many event types; returning
        // anything but 2xx for one we do not handle causes pointless retries.
        break;
    }

    await tx.webhookEvent.update({
      where: { id: event.id },
      data: { status: 'processed', processedAt: new Date() },
    });

    return 'processed';
  }, { maxWait: MAX_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS });
}

/** How long a webhook will queue for a connection before giving up. */
const MAX_WAIT_MS = 20_000;

/** Ceiling on the transaction itself. Comfortably inside Stripe's retry window. */
const TRANSACTION_TIMEOUT_MS = 15_000;

/**
 * Marks a registration paid and queues its confirmation.
 *
 * `WHERE status = 'pending'` makes this at most-once: an event delivered twice,
 * or a session completing and then being replayed, cannot burn a second mat
 * number or send a second email. The mat number comes from a sequence inside
 * the same statement, so concurrent payments cannot collide.
 */
async function handleCompleted(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session) {
  const publicId = session.metadata?.publicId ?? session.client_reference_id;
  if (!publicId || typeof publicId !== 'string') {
    log.warn('webhook: completed session without a registration reference');
    return;
  }

  // Guarded on payment actually being collected. A session can complete with
  // `payment_status: 'unpaid'` for delayed methods, and issuing a ticket then
  // would be exactly the bug this route exists to prevent.
  if (session.payment_status === 'unpaid') {
    log.info('webhook: session completed but unpaid, awaiting async success', { publicId });
    return;
  }

  const rows = await tx.$queryRaw<
    Array<{ publicId: string; fullName: string; email: string; matNumber: number }>
  >`
    UPDATE "Registration"
    SET status = 'paid',
        "matNumber" = nextval('mat_number_seq'),
        "paidAt" = now(),
        "paymentProvider" = 'stripe',
        "paymentRef" = ${session.payment_intent ? String(session.payment_intent) : session.id},
        "stripeSessionId" = COALESCE("stripeSessionId", ${session.id}),
        "holdExpiresAt" = NULL,
        "updatedAt" = now()
    WHERE "publicId" = ${publicId} AND status = 'pending'
    RETURNING "publicId", "fullName", "email", "matNumber"
  `;

  if (rows.length === 0) {
    // Already paid, unknown, or cancelled. Not an error: out-of-order delivery
    // is normal and the registration's own state is authoritative.
    log.info('webhook: no pending registration to mark paid', { publicId });
    return;
  }

  const registration = rows[0]!;

  // Same transaction, so a rolled-back payment cannot leave a confirmation
  // queued and a rolled-back queue entry cannot leave a paid row without mail.
  await tx.$queryRaw`UPDATE "Counter" SET paid = paid + 1 WHERE id = 1`;

  await enqueue(
    {
      type: 'confirmation',
      email: registration.email,
      firstName: registration.fullName.split(' ')[0] ?? registration.fullName,
      matNumber: registration.matNumber,
      publicId: registration.publicId,
    },
    // The transaction's own connection, so the confirmation commits or rolls
    // back with the payment.
    tx,
  );

  log.info('webhook: registration paid', { publicId, matNumber: registration.matNumber });
}

/** A checkout that expired releases its hold. Idempotent: only pending rows. */
async function handleExpired(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session) {
  const publicId = session.metadata?.publicId ?? session.client_reference_id;
  if (!publicId || typeof publicId !== 'string') return;

  const rows = await tx.$queryRaw<Array<{ id: number }>>`
    UPDATE "Registration"
    SET status = 'expired', "updatedAt" = now()
    WHERE "publicId" = ${publicId} AND status = 'pending'
    RETURNING id
  `;

  if (rows.length === 0) return;

  await tx.$queryRaw`UPDATE "Counter" SET reserved = GREATEST(0, reserved - 1) WHERE id = 1`;
  log.info('webhook: checkout expired, hold released', { publicId });
}

/**
 * A refund releases the seat.
 *
 * Both `refund.created` and `charge.refunded` are handled, and delivery order
 * is not guaranteed between them. Both are guarded on `status = 'paid'`, so
 * whichever arrives first does the work and the other is a no-op — a duplicate
 * cannot release the same seat twice, which is the failure that would quietly
 * admit registrations above the cap.
 *
 * The join is on `paymentRef`, which holds the payment intent id we stored at
 * checkout. Stripe does not copy session metadata onto the charge, so the
 * intent id is the reliable handle.
 */
async function handleRefund(tx: Prisma.TransactionClient, event: Stripe.Event) {
  const intentId = intentIdFrom(event.data.object);

  if (!intentId) {
    log.warn('webhook: refund event carried no payment intent', { type: event.type });
    return;
  }

  const match = await tx.$queryRaw<Array<{ publicId: string }>>`
    SELECT "publicId" FROM "Registration" WHERE "paymentRef" = ${intentId} LIMIT 1
  `;
  const publicId = match[0]?.publicId;

  if (!publicId) {
    log.warn('webhook: refund could not be matched to a registration', { type: event.type });
    return;
  }

  const rows = await tx.$queryRaw<Array<{ id: number }>>`
    UPDATE "Registration"
    SET status = 'refunded', "updatedAt" = now()
    WHERE "publicId" = ${publicId} AND status = 'paid'
    RETURNING id
  `;

  if (rows.length === 0) return;

  await tx.$queryRaw`
    UPDATE "Counter" SET paid = GREATEST(0, paid - 1), reserved = GREATEST(0, reserved - 1) WHERE id = 1
  `;
  log.info('webhook: refund processed, seat released', { publicId });
}

/** Pulls the payment intent id out of either a Charge or a Refund. */
function intentIdFrom(object: Stripe.Event.Data.Object): string | null {
  const candidate = object as { payment_intent?: string | { id: string } | null; charge?: string | { payment_intent?: string | { id: string } | null } | null };

  const direct = candidate.payment_intent;
  if (typeof direct === 'string') return direct;
  if (direct && typeof direct === 'object') return direct.id;

  // A Refund points at a Charge rather than at the intent directly.
  const charge = candidate.charge;
  if (charge && typeof charge === 'object') {
    return intentIdFrom(charge as unknown as Stripe.Event.Data.Object);
  }
  return null;
}