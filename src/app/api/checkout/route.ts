import { NextResponse } from 'next/server';
import { MONEY, RESERVE } from '@/content/site';
import { withRouteLogging } from '@/lib/logger';
import { fallbackKV, withKV } from '@/lib/kv';
import { clientIp } from '@/lib/privacy';
import { CHECKOUT_RATE_LIMIT } from '@/lib/registrations';
import { findByPublicId } from '@/lib/repository';
import { getSettings } from '@/lib/settings';
import { getStripe, isRetryableStripeError } from '@/lib/payments/stripe';
import { mockPaymentsAllowed, paymentsEnabled, siteUrl } from '@/lib/env';
import { assertServerConfigured } from '@/lib/env';
import { previewEnabled } from '@/lib/preview';
import { getDb } from '@/lib/db';
import { enqueueStandalone } from '@/lib/outbox';
import { checkoutSchema } from '@/lib/validators';


const MAX_BODY_BYTES = 4_096;

/** Stripe Checkout Sessions live 30 minutes; a hold is 30 minutes. Aligned. */
const CHECKOUT_EXPIRY_SECONDS = 30 * 60;

/**
 * POST /api/checkout
 *
 * Starts payment for a registration. Budget: p95 under 700 ms including the
 * Stripe call.
 *
 * ## The rule this route exists to enforce
 *
 * **No ticket is ever issued without money taken.**
 *
 * The previous implementation chose the mock provider whenever Stripe keys were
 * absent, with no check on the environment, so a production deploy that lost a
 * key handed out paid tickets for free. Here the mock provider is reachable only
 * when `mockPaymentsAllowed` is true, which `lib/env.ts` makes impossible in
 * production regardless of what the environment contains.
 */
export async function POST(request: Request) {
  return withRouteLogging(request, 'POST /api/checkout', async (ctx) => {
    // First thing, before the production configuration check: a preview has no
    // database and no payment provider *by design*, so the configuration check
    // would throw and a visitor would get a generic error instead of being told
    // plainly that this is a preview.
    if (previewEnabled) {
      return NextResponse.json(
        { code: 'preview', message: 'This is a preview deployment. Payments are not enabled here.' },
        { status: 503, headers: { 'Retry-After': '3600' } },
      );
    }

    // Taking money requires a correctly configured environment. Refusing here
    // is the whole point: a misconfigured deploy must not collect a
    // registration it cannot turn into a ticket.
    assertServerConfigured();

    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ message: RESERVE.errors.generic }, { status: 413 });
    }

    const ip = clientIp(request);
    const ipKey = `rl:checkout:ip:${ip}`;
    const allowed = await withKV(
      (kv) => kv.hit(ipKey, CHECKOUT_RATE_LIMIT.perMinute, CHECKOUT_RATE_LIMIT.windowSeconds),
      () => fallbackKV.hit(ipKey, CHECKOUT_RATE_LIMIT.perMinute, CHECKOUT_RATE_LIMIT.windowSeconds),
    );
    if (!allowed) {
      return NextResponse.json({ message: 'Too many attempts.' }, { status: 429, headers: { 'Retry-After': '60' } });
    }

    let body: unknown;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }

    const { publicId } = parsed.data;

    // ---- never issue a ticket without a payment provider -----------------
    if (!paymentsEnabled) {
      ctx.log('error', 'checkout refused: no payment provider configured');
      return NextResponse.json(
        {
          code: 'payments_unavailable',
          waitlist: true,
          message: 'Registration opens soon. Leave your email and we will tell you when it does.',
        },
        { status: 503, headers: { 'Retry-After': '3600' } },
      );
    }

    const registration = await findByPublicId(publicId);
    if (!registration) {
      return NextResponse.json({ message: 'That reservation was not found.' }, { status: 404 });
    }
    if (registration.status === 'paid') {
      return NextResponse.json({ redirectTo: `/ticket/${publicId}` }, { status: 200 });
    }
    if (registration.status !== 'pending') {
      return NextResponse.json(
        { message: 'That reservation has expired. You can register again.' },
        { status: 409 },
      );
    }

    const settings = await getSettings();
    if (!settings.registrationOpen) {
      return NextResponse.json({ message: 'Registration is closed right now.', code: 'closed' }, { status: 403 });
    }

    const origin = siteUrl || new URL(request.url).origin;
    const amountCents = MONEY.reserveCents;

    // ---- development and test only ---------------------------------------
    if (mockPaymentsAllowed && !process.env.STRIPE_SECRET_KEY) {
      // Deliberately unreachable in production: `mockPaymentsAllowed` is false
      // there, and the branch above has already returned.
      const { mockProvider } = await import('@/lib/payments/mock');
      const result = await mockProvider.createCheckout({ publicId, amountCents, email: registration.email, origin });
      return NextResponse.json({ redirectTo: result.redirectTo, provider: 'mock' });
    }

    // ---- Stripe ----------------------------------------------------------
    const stripe = getStripe();

    try {
      const session = await withStripeRetry(() =>
        stripe.checkout.sessions.create(
          {
            mode: 'payment',
            customer_email: registration.email,
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: 'usd',
                  unit_amount: amountCents,
                  product_data: {
                    name: 'Sleep Contest reservation',
                    description: '$10 reserves your mat. The balance is due once the date is announced.',
                  },
                },
              },
            ],
            metadata: { publicId, registrationId: publicId },
            client_reference_id: publicId,
            expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_SECONDS,
            success_url: `${origin}/ticket/${publicId}?paid=1`,
            cancel_url: `${origin}/?canceled=1#reserve`,
          },
          // Derived from the registration, so a double-click or a retry creates
          // one session rather than two, and the entrant is never charged twice
          // for the same attempt.
          { idempotencyKey: `checkout:${publicId}` },
        ),
      );

      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
      }

      // Recorded so a webhook can find the session even if metadata is missing,
      // and so reg_stripe_session_uq can catch a session reused across rows.
      await getDb()
        .then((db) => db.registration.update({ where: { publicId }, data: { stripeSessionId: session.id } }))
        .catch(() => undefined);

      ctx.log('info', 'checkout session created');
      return NextResponse.json({ redirectTo: session.url, provider: 'stripe' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';

      if (isRetryableStripeError(err)) {
        ctx.log('error', 'stripe unavailable at checkout', { error: message });
        // The registration stays pending and its hold is intact, so the entrant
        // can retry. The outbox tells them rather than leaving them guessing.
        await enqueueStandalone({
          type: 'complete_payment',
          email: registration.email,
          firstName: registration.fullName.split(' ')[0] ?? registration.fullName,
          publicId,
        }).catch(() => undefined);

        return NextResponse.json(
          {
            code: 'payment_temporarily_unavailable',
            message: 'Payment is temporarily unavailable. Your details are saved and we will email you a link to complete it.',
          },
          { status: 503, headers: { 'Retry-After': '30' } },
        );
      }

      ctx.log('error', 'checkout failed', { error: message });
      return NextResponse.json({ message: RESERVE.errors.generic }, { status: 500 });
    }
  });
}

/**
 * Retries transient Stripe failures with exponential backoff and jitter.
 *
 * Jitter matters here specifically: a TV-traffic spike produces a thundering
 * herd of simultaneous checkout calls, and synchronised retries would hit Stripe
 * again at exactly the same instant. Three attempts, so the caller is still
 * inside its 700 ms budget on the common failure.
 */
async function withStripeRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isRetryableStripeError(err) || attempt === attempts - 1) throw err;
      const backoff = 150 * 2 ** attempt;
      const jitter = Math.floor(Math.random() * backoff);
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }
  }
  throw lastError;
}