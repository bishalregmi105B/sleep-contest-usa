import { NextResponse } from 'next/server';
import { MONEY, RESERVE } from '@/content/site';
import { db } from '@/lib/db';
import { env, stripeEnabled } from '@/lib/env';
import { markPaid, sendConfirmation } from '@/lib/registrations';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { checkoutSchema } from '@/lib/validators';
import { mockProvider } from '@/lib/payments/mock';
import { stripeProvider } from '@/lib/payments/stripe';


/**
 * POST /api/checkout
 *
 * Takes a publicId and starts payment for it. With the mock provider (the
 * default) the registration is marked paid immediately and the visitor lands on
 * their ticket. With Stripe the browser is redirected to Checkout and the
 * webhook does the marking.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`checkout:${ip}`, { perMinute: 10, burst: 10 })) {
    return NextResponse.json({ message: RESERVE.errors.generic }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const { publicId } = parsed.data;

  const registration = await db.registration.findUnique({ where: { publicId } });
  if (!registration) {
    return NextResponse.json({ message: 'That reservation was not found.' }, { status: 404 });
  }

  const origin = env.siteUrl || new URL(request.url).origin;
  const provider = stripeEnabled ? stripeProvider : mockProvider;

  try {
    const result = await provider.createCheckout({
      publicId,
      amountCents: MONEY.reserveCents,
      email: registration.email,
      origin,
    });

    if (provider.name === 'mock') {
      const paid = await markPaid(publicId, { provider: 'mock', ref: result.paymentRef });
      if (paid) {
        await sendConfirmation({
          email: paid.email,
          firstName: paid.firstName,
          matNumber: paid.matNumber,
          publicId,
        });
      }
    } else {
      await db.registration.update({
        where: { publicId },
        data: { paymentProvider: 'stripe', paymentRef: result.paymentRef },
      });
    }

    return NextResponse.json({ redirectTo: result.redirectTo });
  } catch (err) {
    console.error('[checkout] failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ message: RESERVE.errors.generic }, { status: 500 });
  }
}
