import { COUNTER, SITE, plain } from '@/content/site';
import { getProgress } from '@/lib/progress';
import { EcgLine } from '@/components/ui/EcgLine';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';
import { ShareButton } from './ShareButton';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

type CounterProps = {
  /** Real paid, non-internal count. Never adjusted. */
  readonly count: number;
  /** Admin-editable milestone ladder, ascending, last entry equals the goal. */
  readonly milestones: readonly number[];
  /** The public final goal. */
  readonly goal: number;
  /** Below this count the target is shown instead of a number. */
  readonly counterMinPublic: number;
};

/**
 * S2 Counter.
 *
 * The number is the real paid count, server-rendered, so it is correct before
 * hydration and present in the HTML for crawlers.
 *
 * ## Why a milestone ladder rather than "N / 200,000"
 *
 * The client asked for "293 / 500" and then for 200,000 people. Those cannot
 * both be true, and printing a number that is not the real count is false
 * social proof on a page that takes money.
 *
 * So the display shows the real count against the **next milestone** — a
 * reachable target the ladder moves through — while the final goal stays on
 * screen permanently. Same sense of momentum, only true numbers. The ladder,
 * the goal and the threshold are all editable from admin.
 *
 * All the rules live in `lib/progress.ts`, which is unit-tested; this component
 * only renders the result.
 */
export function Counter({ count, milestones, goal, counterMinPublic }: CounterProps) {
  const progress = getProgress({ paidCount: count, milestones, goal, counterMinPublic });
  const showCount = progress.kind === 'progress' || progress.kind === 'complete';

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
            {showCount && progress.kind === 'progress' ? (
              <>
                <p className="flex flex-wrap items-baseline justify-center gap-3">
                  <span
                    className="font-mono text-5xl font-bold tabular-nums text-paper sm:text-6xl md:text-7xl"
                    data-numeric
                    data-testid="counter-value"
                  >
                    {progress.count.toLocaleString('en-US')}
                  </span>
                  <span className="font-mono text-2xl text-mist sm:text-3xl font-medium">
                    / {plain(progress.currentMilestone)}
                  </span>
                </p>
                <p
                  className="font-mono text-xs uppercase tracking-[0.16em] text-mist font-semibold"
                  data-testid="counter-milestone"
                >
                  {progress.label}
                </p>
              </>
            ) : showCount && progress.kind === 'complete' ? (
              <p
                className="text-center text-lg leading-relaxed text-paper"
                data-testid="counter-target"
              >
                <span className="font-mono text-5xl font-bold tabular-nums" data-numeric data-testid="counter-value">
                  {progress.count.toLocaleString('en-US')}
                </span>
                <span className="block pt-2 font-mono text-xs uppercase tracking-[0.16em] text-mist font-semibold">
                  Goal reached
                </span>
              </p>
            ) : (
              <p
                className="max-w-xl text-center text-lg leading-relaxed text-paper"
                data-testid="counter-target"
              >
                {progress.kind === 'hidden' ? progress.copy : ''}
              </p>
            )}

            {/* The count is always shown, including zero. A real 0 is honest;
                hiding it was a design preference, and the client has asked for
                the numeral to be visible from the first visit. */}
            {progress.kind === 'progress' && progress.count === 0 ? (
              <p className="sr-only" data-testid="counter-zero-note">
                No sleepers registered yet.
              </p>
            ) : null}

            {SITE.demoMode ? (
              <span className="rounded-pill border border-mint/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-mint font-semibold">
                {COUNTER.demoTag}
              </span>
            ) : null}

            <EcgLine
              value={count}
              max={progress.kind === 'progress' ? progress.currentMilestone : goal}
              label={COUNTER.label}
              className="mt-5 w-full"
              hideValue={!showCount}
              beats={14}
            />

            {progress.kind === 'progress' ? (
              <p
                className="font-mono text-xs uppercase tracking-[0.14em] text-mist font-semibold"
                data-testid="counter-overall"
              >
                {progress.overall}
              </p>
            ) : null}

            <p
              className="mt-1 max-w-xl text-center text-base leading-relaxed text-paper font-semibold"
              data-testid="counter-goal"
            >
              {progress.goalLine}
            </p>

            <p className="max-w-xl text-center text-base leading-relaxed text-mist">{COUNTER.note}</p>
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