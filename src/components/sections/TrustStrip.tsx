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
      <p className="text-sm leading-relaxed text-mist">{TRUST.refund}</p>

      <nav aria-label="Contest terms" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        <TermLink href={TRUST.rules.href}>{TRUST.rules.label}</TermLink>
        <TermLink href={TRUST.refundLink.href}>{TRUST.refundLink.label}</TermLink>
        <TermLink href={TRUST.privacy.href}>{TRUST.privacy.label}</TermLink>
      </nav>

      {stripeLive ? (
        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] leading-relaxed text-mist/75">
          {TRUST.stripeLive}
        </p>
      ) : null}
    </div>
  );
}

function TermLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs text-mist/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-tungsten"
    >
      {children}
    </Link>
  );
}