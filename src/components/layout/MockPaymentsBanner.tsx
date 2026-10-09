import { TRUST } from '@/content/site';
import { mockPayments } from '@/lib/env-public';
import { isProduction } from '@/lib/env';

/**
 * A production deployment left on the mock payment provider.
 *
 * Takes no money and issues no real ticket, so a visitor who registers on such
 * a deployment must not come away believing they have paid. The banner is
 * persistent, slim and above everything else.
 *
 * It only renders when both conditions hold: this really is a production
 * build, and the provider really is the mock one. In development the banner is
 * suppressed, because there the mock provider is a deliberate convenience and
 * saying so on every page load is noise.
 */
export function MockPaymentsBanner() {
  if (!isProduction || !mockPayments) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b border-tungsten/25 bg-ink/90 px-4 py-1.5 backdrop-blur-sm"
      data-testid="mock-payments-banner"
    >
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-tungsten/80">
        {TRUST.mockPayments}
      </p>
    </div>
  );
}