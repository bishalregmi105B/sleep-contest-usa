import Link from 'next/link';
import { FACTS } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';

/**
 * The facts bar.
 *
 * A hairline strip under the hero carrying the five questions a paid-entry
 * contest has to answer before anyone reaches the form: where, when, who, what
 * it costs, and what to do next. Every value is read from `site.ts`, so the bar
 * cannot drift out of step with the counter, the money or the rules page.
 *
 * On desktop it sticks below the header once the hero has scrolled away, in a
 * compact form. On mobile it is a two-by-two grid and is never sticky, because
 * a sticky bar plus the mobile reserve bar plus the header is three bars of
 * chrome on a 844px screen.
 */
export function FactsBar() {
  return (
    <>
      {/* Desktop: sticky, compact, hidden until the hero is out of view. */}
      <div
        aria-hidden="false"
        className="sticky top-[72px] z-30 hidden border-b border-white/10 bg-ink/85 backdrop-blur-md lg:block"
        data-testid="facts-bar-sticky"
      >
        <div className="content-frame">
          <div className="flex items-center justify-between gap-6 py-3">
            <dl className="flex flex-1 items-center divide-x divide-white/10">
              {FACTS.cells.map((cell) => (
                <div key={cell.label} className="flex-1 px-5 first:pl-0">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist/75">
                    {cell.label}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm text-paper">{cell.value}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href="#reserve" event={RESERVE_CLICK} size="sm" className="shrink-0">
              {FACTS.cta}
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Mobile: a grid in the flow, above the CTA. */}
      <section
        aria-label={FACTS.label}
        className="border-y border-white/10 bg-ink/50 backdrop-blur-sm lg:hidden"
        data-testid="facts-bar"
      >
        <div className="content-frame py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            {FACTS.cells.map((cell) => (
              <div key={cell.label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist/75">
                  {cell.label}
                </dt>
                <dd className="mt-1 text-sm leading-snug text-paper">{cell.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink href="#reserve" event={RESERVE_CLICK} className="w-full">
              {FACTS.cta}
            </ButtonLink>
            <div className="flex justify-center gap-5">
              <Link
                href={FACTS.rulesLink.href}
                className="text-xs text-mist/70 underline decoration-white/20 underline-offset-4"
              >
                {FACTS.rulesLink.label}
              </Link>
              <Link
                href={FACTS.refundLink.href}
                className="text-xs text-mist/70 underline decoration-white/20 underline-offset-4"
              >
                {FACTS.refundLink.label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}