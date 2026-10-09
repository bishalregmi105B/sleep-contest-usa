import Link from 'next/link';
import { TRUST } from '@/content/site';

/**
 * The trust strip.
 *
 * Small, calm, and directly under the submit button. A refund promise next to
 * the payment step is the single highest-value line on a paid-entry page: the
 * research behind this is unambiguous that a plain-language refund policy
 * beside the payment step is a conversion feature, not legal clutter.
 *
 * The payment line only appears when Stripe is actually configured. A homemade
 * padlock icon conveys nothing, and claiming a processor we are not using is
 * worse than saying nothing at all.
 */
export function TrustStrip({ stripeLive }: { readonly stripeLive: boolean }) {
  return (
    <div className="mt-6 border-t border-white/10 pt-5" data-testid="trust-strip">
      <div className="flex items-start gap-2.5">
        <span className="mt-1 size-2 shrink-0 rounded-full bg-mint" aria-hidden="true" />
        <p className="text-sm font-medium leading-relaxed text-paper/95">{TRUST.refund}</p>
      </div>

      <nav aria-label="Contest terms" className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5">
        <TermLink href={TRUST.rules.href}>{TRUST.rules.label}</TermLink>
        <TermLink href={TRUST.refundLink.href}>{TRUST.refundLink.label}</TermLink>
        <TermLink href={TRUST.privacy.href}>{TRUST.privacy.label}</TermLink>
      </nav>

      <p className="mt-4 flex items-center gap-2 font-mono text-xs leading-relaxed text-mist">
        <svg className="size-3.5 shrink-0 text-tungsten" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>
          {stripeLive
            ? TRUST.stripeLive
            : '256-bit SSL encrypted reservation. We never store your card details.'}
        </span>
      </p>
    </div>
  );
}

function TermLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-medium text-mist underline decoration-white/25 underline-offset-4 transition-colors hover:text-paper"
    >
      {children}
    </Link>
  );
}