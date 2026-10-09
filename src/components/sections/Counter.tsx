import { COUNTER, SITE, plain } from '@/content/site';
import { counterDisplay } from '@/lib/counter';
import { EcgLine } from '@/components/ui/EcgLine';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';
import { ShareButton } from './ShareButton';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

type CounterProps = {
  /** Paid registration count, read from the store on the server. */
  readonly count: number;
};

/**
 * S2 Counter.
 *
 * The number is the real count, server-rendered, so it is correct before
 * hydration and present in the HTML for crawlers. Below the public threshold
 * the numeral is replaced by the target and the story: see `lib/counter.ts` for
 * why a zero is never shown.
 */
export function Counter({ count }: CounterProps) {
  const display = counterDisplay(count);
  const showCount = display.kind === 'count';

  return (
    <section
      id="counter"
      aria-labelledby="counter-heading"
      className="section-shell overflow-hidden"
    >
      <SectionScrim />
      <div className="content-frame relative z-10">
        <div className="mx-auto max-w-4xl">
          <SectionHeading title="Sleepers registered so far" as="h2" align="center" />

          <div className="mt-10 flex flex-col items-center gap-3">
            {showCount ? (
              <p className="flex flex-wrap items-baseline justify-center gap-3">
                <span
                  className="font-mono text-5xl font-bold tabular-nums text-paper sm:text-6xl md:text-7xl"
                  data-numeric
                  data-testid="counter-value"
                >
                  {display.count.toLocaleString('en-US')}
                </span>
                <span className="font-mono text-2xl text-mist sm:text-3xl font-medium">
                  / {plain(SITE.goal)}
                </span>
              </p>
            ) : (
              <p
                className="max-w-xl text-center text-lg leading-relaxed text-paper"
                data-testid="counter-target"
              >
                {display.copy}
              </p>
            )}

            {SITE.demoMode ? (
              <span className="rounded-pill border border-mint/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-mint font-semibold">
                {COUNTER.demoTag}
              </span>
            ) : null}

            <EcgLine
              value={count}
              max={SITE.goal}
              label={COUNTER.label}
              className="mt-5 w-full"
              hideValue={!showCount}
              beats={14}
            />

            <p className="mt-1 max-w-xl text-center text-base leading-relaxed text-mist">
              {COUNTER.note}
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <ButtonLink href="#reserve" event={RESERVE_CLICK} data-testid="counter-cta">
                Reserve my spot · $10
              </ButtonLink>
              <ShareButton />
            </div>
            <p className="font-mono text-xs text-mist font-medium">
              $10 now · 100% money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}