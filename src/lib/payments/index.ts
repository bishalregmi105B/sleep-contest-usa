import type { CheckoutInput } from '@/lib/validators';

/**
 * Payment provider interface.
 *
 * Two implementations exist: `mock` (the default, so the site runs with zero
 * credentials) and `stripe` (used only when STRIPE_SECRET_KEY is set).
 */

export type CheckoutRequest = {
  readonly publicId: string;
  readonly amountCents: number;
  readonly email: string;
  /** Absolute origin, e.g. http://localhost:3000 */
  readonly origin: string;
};

export type CheckoutResult = {
  /** Where the browser should go next. */
  readonly redirectTo: string;
  readonly provider: 'mock' | 'stripe';
  /** Set by Stripe; null for the mock provider, which completes instantly. */
  readonly paymentRef: string | null;
};

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}

export type { CheckoutInput };