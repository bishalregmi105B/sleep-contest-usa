import { COUNTER, SITE } from '@/content/site';
import { HeartbeatLine } from '@/components/ui/HeartbeatLine';
import { StickerButton } from '@/components/ui/StickerButton';
import { ShareButton } from './ShareButton';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

type CounterProps = {
  /** Paid registration count, read from the database on the server. */
  readonly count: number;
};

/**
 * S2 Counter.
 *
 * The number is the real database count, server-rendered, so it is correct
 * before hydration and in the HTML for crawlers. The client island below
 * refreshes it after paint.
 */
export function Counter({ count }: CounterProps) {
  const formatted = count.toLocaleString('en-US');

  return (
    <section
      id="counter"
      aria-labelledby="counter-heading"
      className="section-shell overflow-hidden"
    >
      <SectionScrim />
      <div className="content-frame relative z-10">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            title="Sleepers registered so far"
            as="h2"
            align="center"
          />

          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="flex flex-wrap items-center justify-center gap-3">
              <span
                className="font-mono text-5xl font-bold text-zzz tabular-nums sm:text-6xl md:text-7xl"
                data-testid="counter-value"
              >
                {formatted}
              </span>
              <span className="font-mono text-2xl text-lavender sm:text-3xl">
                / {SITE.goal.toLocaleString('en-US')}
              </span>
              {SITE.demoMode ? (
                <span className="rounded-full border-2 border-zzz px-3 py-1 font-mono text-xs font-bold uppercase text-zzz">
                  {COUNTER.demoTag}
                </span>
              ) : null}
            </p>

            <HeartbeatLine
              value={count}
              max={SITE.goal}
              label={COUNTER.label}
              className="mt-4 w-full"
            />

            <p className="max-w-xl text-center text-body-md text-lavender">
              {COUNTER.note}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <StickerButton href="#reserve" data-testid="counter-cta">
              Reserve my spot · $10
            </StickerButton>
            <ShareButton />
          </div>
        </div>
      </div>
    </section>
  );
}