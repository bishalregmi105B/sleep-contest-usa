import { FINAL_CTA, HERO } from '@/content/site';
import { counterDisplay } from '@/lib/counter';
import { ButtonLink } from '@/components/ui/Button';
import { SectionScrim } from './SectionScrim';

/**
 * S9 Final CTA.
 *
 * Dawn. The headline, the button, and a truthful count line.
 *
 * The previous build said "Join 200,000 Americans already registered" directly
 * above a counter reading zero. The line is now derived from the real count,
 * and when the count is below the public threshold it does not leak the number
 * it is meant to be hiding.
 */
export function FinalCta({ count }: { readonly count: number }) {
  const display = counterDisplay(count);

  const note =
    display.kind === 'count'
      ? FINAL_CTA.withSleepers(display.count)
      : display.kind === 'starting'
        ? FINAL_CTA.noneYet
        : FINAL_CTA.belowThreshold;

  return (
    <section id="cta" aria-labelledby="cta-heading" className="section-shell overflow-hidden">
      <SectionScrim />

      {/* A low warm bloom: sunrise through haze, rather than a daylight sky. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4"
        style={{
          background:
            'radial-gradient(70% 100% at 50% 108%, rgba(255,184,103,0.18) 0%, transparent 70%)',
        }}
      />

      <div className="content-frame relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="cta-heading"
            className="font-display text-[clamp(2.5rem,6.5vw,5rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.01em] text-paper"
          >
            {FINAL_CTA.heading}
          </h2>

          <p className="mx-auto mt-6 text-lg leading-relaxed text-mist">{note}</p>

          <div className="mt-9 flex justify-center">
            <ButtonLink href="#reserve" size="lg" data-testid="cta-cta">
              {HERO.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}