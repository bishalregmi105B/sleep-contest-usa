import type { CheckoutRequest, CheckoutResult, PaymentProvider } from './index';

/**
 * Mock payment provider.
 *
 * Completes instantly and sends the visitor straight to their ticket. This is
 * the default so the whole flow works with no credentials; the Stripe provider
 * takes over as soon as STRIPE_SECRET_KEY is set.
 */
export const mockProvider: PaymentProvider = {
  name: 'mock',

  async createCheckout({ publicId }: CheckoutRequest): Promise<CheckoutResult> {
    return {
      redirectTo: `/ticket/${publicId}`,
      provider: 'mock',
      paymentRef: `mock_${publicId}`,
    };
  },
};