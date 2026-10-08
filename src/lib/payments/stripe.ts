import Stripe from 'stripe';
import { env } from '@/lib/env';
import type { CheckoutRequest, PaymentProvider } from './index';

/**
 * Stripe Checkout provider.
 *
 * Only constructed when STRIPE_SECRET_KEY is present. The webhook
 * (/api/webhooks/stripe) is what actually marks a registration paid; the
 * success URL is only a redirect.
 */
export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createCheckout({ publicId, amountCents, email, origin }: CheckoutRequest) {
    const stripe = new Stripe(env.stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Sleep Contest reservation',
              description: '$10 reserves your mat. $29.99 is due once the date is announced.',
            },
          },
        },
      ],
      // Metadata is how the webhook finds the registration again.
      metadata: { publicId },
      success_url: `${origin}/ticket/${publicId}?paid=1`,
      cancel_url: `${origin}/?canceled=1#reserve`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return {
      redirectTo: session.url,
      provider: 'stripe',
      paymentRef: session.id,
    };
  },
};

/** Verifies a webhook signature against the raw request body. */
export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = new Stripe(env.stripeSecretKey);
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}