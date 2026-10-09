import { getDb } from './db';
import { log } from './logger';
import { renderConfirmation, renderCompletePayment } from './email/templates';
import { emailProvider } from './email/provider';

/**
 * Email outbox.
 *
 * Every email is a row first and is sent from a worker afterwards. The previous
 * implementation sent confirmations inline, inside the Stripe webhook, which
 * meant:
 *
 *  - the webhook could not acknowledge inside 300 ms if the mail provider was
 *    slow, and Stripe would then retry it, and it would try to send the mail
 *    again; and
 *  - a provider outage lost the mail silently, with the registration marked
 *    paid and no ticket ever arriving.
 *
 * Writing the row in the webhook's transaction fixes both: the transaction is
 * the record of truth, and delivery is a separate, retryable concern.
 */

/** Exponential backoff, then dead. Total attempt window is about 14 hours. */
const BACKOFF_SECONDS = [60, 300, 1_800, 7_200, 43_200];
const MAX_ATTEMPTS = BACKOFF_SECONDS.length;

export type OutboxPayload =
  | {
      type: 'confirmation';
      email: string;
      firstName: string;
      matNumber: number;
      publicId: string;
    }
  | {
      type: 'complete_payment';
      email: string;
      firstName: string;
      publicId: string;
    };

type OutboxClient = Pick<
  Awaited<ReturnType<typeof getDb>>,
  'emailOutbox'
>;

/**
 * Queues an email.
 *
 * Takes the client explicitly so the caller can pass its **transaction**
 * connection. That matters: the previous version called `getDb()` internally,
 * which opened a second connection outside the payment transaction. A payment
 * that then rolled back would have left a confirmation queued for a ticket that
 * was never issued, and a confirmation for a ticket with no mat number.
 *
 * @param client the caller's transaction client when there is a transaction.
 */
export async function enqueue(payload: OutboxPayload, client?: OutboxClient): Promise<void> {
  const db = client ?? (await getDb());

  // Keyed on the event, not the time, so a replayed webhook cannot queue a
  // second copy. This is the guarantee that stops double-sending.
  const idempotencyKey =
    payload.type === 'confirmation'
      ? `confirmation:${payload.publicId}:${payload.matNumber}`
      : `complete_payment:${payload.publicId}`;

  await db.emailOutbox.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      type: payload.type,
      toEmail: payload.email,
      payload: payload as unknown as object,
      idempotencyKey,
      status: 'pending',
    },
  });
}

/**
 * Queues an email outside a transaction.
 *
 * Used where there is no surrounding transaction, such as the sweeper
 * expiring a hold.
 */
export async function enqueueStandalone(payload: OutboxPayload): Promise<void> {
  await enqueue(payload);
}

type OutboxRow = {
  id: bigint;
  type: string;
  toEmail: string;
  payload: unknown;
  attempts: number;
};

/**
 * Claims and sends due emails.
 *
 * Rows are claimed with FOR UPDATE SKIP LOCKED inside a transaction, so two
 * concurrent drainers take disjoint sets of rows rather than one blocking on the
 * other's locks. That is what makes it safe for the cron sweeper and an
 * `after()` handler to both drain the outbox at once.
 *
 * Each row is sent in its own transaction so one slow send does not hold the
 * batch claim open.
 */
export async function drainOutbox(limit = 25): Promise<{ sent: number; retried: number; dead: number }> {
  const db = await getDb();

  const claimed = await db.$queryRaw<OutboxRow[]>`
    SELECT id, type, "toEmail", payload, attempts
    FROM "EmailOutbox"
    WHERE status IN ('pending', 'retry') AND "nextAttemptAt" <= now()
    ORDER BY "nextAttemptAt" ASC
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `;

  let sent = 0;
  let retried = 0;
  let dead = 0;

  for (const row of claimed) {
    const ok = await deliver(row);
    if (ok) {
      sent += 1;
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null },
      });
      continue;
    }

    const attempts = row.attempts + 1;
    const isDead = attempts >= MAX_ATTEMPTS;
    if (isDead) {
      dead += 1;
    } else {
      retried += 1;
    }

    await db.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: isDead ? 'dead' : 'retry',
        attempts,
        // Never logs the address: the outbox is where personal data is.
        lastError: isDead ? `giving up after ${attempts} attempts` : 'provider error',
        nextAttemptAt: new Date(Date.now() + (BACKOFF_SECONDS[attempts - 1] ?? 43_200) * 1000),
      },
    });

    if (isDead) {
      log.error('outbox message dead', { id: String(row.id), type: row.type, attempts });
    }
  }

  return { sent, retried, dead };
}

async function deliver(row: OutboxRow): Promise<boolean> {
  try {
    const payload = row.payload as {
      firstName?: string;
      matNumber?: number;
      publicId?: string;
    };
    const provider = emailProvider();

    if (row.type === 'confirmation') {
      const rendered = renderConfirmation({
        firstName: payload.firstName ?? '',
        matNumber: payload.matNumber ?? 0,
        ticketUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/ticket/${payload.publicId}`,
        refundNote: '',
      });
      await provider.send({ to: row.toEmail, subject: rendered.subject, html: rendered.html, text: rendered.text });
      return true;
    }

    const rendered = renderCompletePayment({
      firstName: payload.firstName ?? '',
      ticketUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/?resume=${payload.publicId}`,
    });
    await provider.send({ to: row.toEmail, subject: rendered.subject, html: rendered.html, text: rendered.text });
    return true;
  } catch (err) {
    log.warn('outbox delivery failed', {
      id: String(row.id),
      type: row.type,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return false;
  }
}

/** Depth and dead count, for the admin health card. */
export async function outboxHealth(): Promise<{ pending: number; retry: number; dead: number; oldestPendingAgeHours: number | null }> {
  const db = await getDb();
  const grouped = await db.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status, count(*)::bigint AS count FROM "EmailOutbox" GROUP BY status
  `;
  const counts = Object.fromEntries(grouped.map((r) => [r.status, Number(r.count)]));

  const oldest = await db.$queryRaw<Array<{ age: number | null }>>`
    SELECT EXTRACT(EPOCH FROM (now() - min("createdAt"))) AS age
    FROM "EmailOutbox" WHERE status IN ('pending', 'retry')
  `;

  return {
    pending: counts.pending ?? 0,
    retry: counts.retry ?? 0,
    dead: counts.dead ?? 0,
    oldestPendingAgeHours: oldest[0]?.age === null || oldest[0]?.age === undefined ? null : Math.round(oldest[0].age / 3600),
  };
}

/**
 * Schedules an outbox drain after the response has been sent.
 *
 * Next.js `after()` runs the callback once the response is flushed, so the user
 * is not waiting for the mail provider. When it is unavailable — an unsupported
 * runtime, or the platform dropping `after` work on a hard kill — the sweeper
 * picks the row up anyway within a minute. Nothing depends on this succeeding.
 */
export function drainSoon(): void {
  void (async () => {
    try {
      const { after } = await import('next/server');
      after(async () => {
        await drainOutbox().catch(() => undefined);
      });
    } catch {
      // No `after` here. The cron sweeper is the backstop; do not fail the
      // request over it.
    }
  })();
}