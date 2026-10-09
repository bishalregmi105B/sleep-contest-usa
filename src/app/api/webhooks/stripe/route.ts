import type Stripe from 'stripe';
import { getDb } from '@/lib/db';
import { log } from '@/lib/logger';
import { drainSoon } from '@/lib/outbox';
import { constructStripeEvent } from '@/lib/payments/stripe';
import { processEvent } from '@/lib/webhooks';
import { assertServerConfigured, stripeEnabled } from '@/lib/env';
import { previewEnabled } from '@/lib/preview';


/**
 * POST /api/webhooks/stripe
 *
 * The only authority for a paid registration. The success URL is a redirect,
 * not proof of payment.
 *
 * ## What "exactly once" means here
 *
 * Stripe retries a webhook for up to three days until it gets a 2xx, and it
 * sends duplicates and out-of-order events as a matter of course. The previous
 * implementation had a `WebhookEvent` table and a comment saying replay was
 * handled; neither was true — the table was never written to, so every retry
 * re-sent the confirmation email.
 *
 * The guarantees now, in order:
 *
 *  1. The event id is inserted into `WebhookEvent` first, in the same
 *     transaction as the state change. A duplicate hits the primary key and
 *     aborts the transaction, so the work is never repeated. Acknowledged 200,
 *     because a duplicate is a success, not an error — returning anything else
 *     makes Stripe keep retrying it.
 *  2. The paid transition is guarded on `status = 'pending'`, so it applies at
 *     most once per registration even if the ledger were lost.
 *  3. The confirmation is an outbox row keyed on the registration and mat
 *     number, so even a duplicated row cannot send twice.
 *  4. Email is never sent inline. The response does not wait on Resend, which is
 *     what keeps the acknowledgement inside 300 ms.
 */
export async function POST(request: Request) {
  if (previewEnabled) {
    return Response.json({ message: 'Preview deployment: webhooks are not processed.' }, { status: 503 });
  }

  // A payment webhook must never be processed by a half-configured deployment.
  assertServerConfigured();

  if (!stripeEnabled) {
    return Response.json({ message: 'Stripe is not configured.' }, { status: 501 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ message: 'Missing signature.' }, { status: 400 });
  }

  // Read as raw text before parsing: the signature covers the exact bytes.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ message: 'Could not read the request body.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(raw, signature);
  } catch {
    // Never log the body: it carries customer details.
    log.warn('webhook: signature verification failed');
    return Response.json({ message: 'Invalid signature.' }, { status: 400 });
  }

  const db = await getDb();

  try {
    const outcome = await processEvent(db, event);

    if (outcome === 'duplicate') {
      // A replay. Acknowledged so Stripe stops retrying, with nothing done.
      log.info('webhook: duplicate event ignored', { eventId: event.id, type: event.type });
    }

    // Mail goes out after the response, never inside it.
    drainSoon();

    return Response.json({ received: true, result: outcome });
  } catch (err) {
    log.error('webhook: processing failed', {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : 'unknown',
    });
    // 500 so Stripe retries. The event is marked failed, and the next attempt
    // re-enters with the same id.
    await db.webhookEvent
      .update({ where: { id: event.id }, data: { status: 'failed', lastError: 'processing error' } })
      .catch(() => undefined);
    return Response.json({ message: 'Processing failed.' }, { status: 500 });
  }
}
