import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripeEnabled } from '@/lib/env';
import { markPaid, sendConfirmation } from '@/lib/registrations';
import { constructStripeEvent } from '@/lib/payments/stripe';

/**
 * POST /api/webhooks/stripe
 *
 * The authority for a Stripe payment: only here does a registration become
 * paid. The success URL is a redirect, not proof of payment.
 *
 * The body must be read as raw text before parsing, because the signature is
 * computed over the exact bytes Stripe sent.
 */
export async function POST(request: Request) {
  if (!stripeEnabled) {
    return NextResponse.json({ message: 'Stripe is not configured.' }, { status: 501 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Missing signature.' }, { status: 400 });
  }

  let event;
  try {
    const raw = await request.text();
    event = constructStripeEvent(raw, signature);
  } catch {
    // Never log the body: it can contain customer details.
    console.error('[webhook] signature verification failed');
    return NextResponse.json({ message: 'Invalid signature.' }, { status: 400 });
  }

  // Idempotency: a replayed event returns 200 without doing the work twice.
  const seen = await db.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const publicId = session.metadata?.publicId;

    if (typeof publicId === 'string' && publicId) {
      const paid = await markPaid(publicId, {
        provider: 'stripe',
        ref: session.payment_intent ? String(session.payment_intent) : session.id,
      });

      if (paid && !('alreadyPaid' in paid && paid.alreadyPaid)) {
        await sendConfirmation({
          email: paid.email,
          firstName: paid.firstName,
          matNumber: paid.matNumber,
          publicId,
        });
      }
    }
  }

  // Recorded after the work, so a crash mid-way replays rather than skipping.
  await db.webhookEvent.create({ data: { id: event.id } }).catch(() => {
    // A duplicate here is fine: the work already happened.
  });

  return NextResponse.json({ received: true });
}
