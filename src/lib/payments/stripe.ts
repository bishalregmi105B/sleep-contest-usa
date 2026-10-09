import Stripe from 'stripe';
import { env, stripeEnabled } from '@/lib/env';

/**
 * Stripe client and error classification.
 *
 * Constructed lazily and memoised. A Stripe client holds an HTTP agent, so
 * building one at module scope would do network-adjacent work during
 * `next build`, which imports route modules to analyse them.
 */

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeEnabled) {
    throw new Error('Stripe is not configured: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required.');
  }
  client ??= new Stripe(env.stripeSecretKey, {
    // Explicit rather than relying on the SDK default. Retries here multiply
    // against the client's own and can double-charge; the one retry loop lives
    // in the checkout route, where the idempotency key is attached.
    maxNetworkRetries: 0,
    timeout: 20_000,
  });
  return client;
}

/**
 * Whether a Stripe failure is worth retrying.
 *
 * Split from permanent failures deliberately: retrying a card decline wastes the
 * entrant's time and, on the expiry path, can cancel a session they might have
 * completed.
 *
 * Stripe's own error types are used rather than message matching, so a wording
 * change upstream cannot silently turn a permanent failure into a retry loop.
 */
export function isRetryableStripeError(error: unknown): boolean {
  // A network-level failure (DNS, TLS, timeout) is not a StripeError.
  if (!(error instanceof Stripe.errors.StripeError)) {
    return error instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(error.message);
  }

  switch (error.type) {
    case 'StripeConnectionError':
    case 'StripeAPIError':
    case 'StripeRateLimitError':
      return true;
    case 'StripeCardError':
    case 'StripeInvalidRequestError':
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
    case 'StripeSignatureVerificationError':
      return false;
    default:
      return false;
  }
}

/**
 * Verifies a webhook signature against the raw request body.
 *
 * The raw bytes are required: Stripe computes the signature over the exact body
 * it sent, and re-serialising the parsed JSON would change the bytes and fail
 * verification.
 */
export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}