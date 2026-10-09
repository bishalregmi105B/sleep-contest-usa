import Link from 'next/link';
import { RULES_SUMMARY } from '@/content/site';
import { Card } from '@/components/ui/Card';

/**
 * "The rules in 60 seconds".
 *
 * Sits beside the form. A first-time entrant should never have to open the full
 * rules page to answer who can enter, what it costs and how the winner is
 * chosen — and the full rules are one click away for anyone who wants them.
 *
 * The disclaimer is not a formality: the summary is a convenience, and the
 * official page is what binds.
 */
export function RulesSummary() {
  return (
    <Card as="aside" className="p-6" aria-labelledby="rules-summary-heading">
      <h3 id="rules-summary-heading" className="font-display text-lg font-bold uppercase tracking-wide text-paper">
        {RULES_SUMMARY.heading}
      </h3>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mist/75">
        {RULES_SUMMARY.disclaimer}
      </p>

      <dl className="mt-5 space-y-4">
        {RULES_SUMMARY.items.map((item) => (
          <div key={item.label}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-tungsten/80">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-mist">{item.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={RULES_SUMMARY.link.href}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-paper underline decoration-tungsten/40 underline-offset-4 transition-colors hover:decoration-tungsten"
      >
        {RULES_SUMMARY.link.label}
        <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}