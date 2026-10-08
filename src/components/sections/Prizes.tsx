import { PRIZES, PRIZES_SECTION, PRICE_CARD, sponsorClause } from '@/content/site';
import { GlassCard } from '@/components/ui/GlassCard';
import { SlotRoll } from './SlotRoll';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/** Podium step heights and colours, tallest and gold in the centre. */
const STEPS = [
  { place: 2, height: 'h-32 sm:h-40', metal: 'bg-gradient-to-b from-[#E8ECF5] to-[#9AA3B8]', label: '2nd' },
  { place: 1, height: 'h-48 sm:h-60', metal: 'bg-linear-to-b from-[#FFE14A] to-[#C99700]', label: '1st' },
  { place: 3, height: 'h-24 sm:h-32', metal: 'bg-linear-to-b from-[#E0A071] to-[#8A4B22]', label: '3rd' },
] as const;

function prizeFor(place: number) {
  return PRIZES.find((p) => p.place === place);
}

/**
 * S5 Prizes.
 *
 * The podium is DOM with CSS 3D perspective rather than WebGL, so the money
 * stays crisp, selectable and readable by a screen reader. Real <ol> semantics
 * with the steps visually arranged.
 */
export function Prizes() {
  const runnerUp = prizeFor(4);
  const fifth = prizeFor(5);

  return (
    <section id="prizes" aria-labelledby="prizes-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading
          title={PRIZES_SECTION.heading}
          sub={PRIZES_SECTION.sub}
          as="h2"
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="[perspective:900px]">
            <ol className="flex items-end justify-center gap-3 [transform:rotateX(6deg)] sm:gap-6">
              {STEPS.map((step) => {
                const prize = prizeFor(step.place);
                if (!prize) return null;
                const isGrand = prize.grand;

                return (
                  <li
                    key={prize.place}
                    className={`relative flex ${step.height} w-24 flex-col items-center justify-center rounded-t-lg border-[3px] border-ink ${step.metal} sm:w-36`}
                  >
                    {isGrand ? (
                      <span className="absolute -top-4 rotate-[-4deg] rounded-sm bg-pillow px-2 py-1 font-mono text-[10px] font-bold text-ink">
                        {PRIZES_SECTION.grandRibbon}
                      </span>
                    ) : null}

                    <span className="font-mono text-xs font-bold uppercase text-ink/70">
                      {step.label}
                    </span>
                    {isGrand ? (
                      <span className="my-1 text-2xl sm:text-3xl" aria-hidden="true">
                        🏆
                      </span>
                    ) : null}
                    <span className="font-mono text-sm font-bold text-ink sm:text-lg">
                      ${prize.amount.toLocaleString('en-US')}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* 4th and 5th sit below the podium, as two smaller blocks. */}
            <ol className="mt-4 flex justify-center gap-6">
              {[runnerUp, fifth].map((prize) =>
                prize ? (
                  <li
                    key={prize.place}
                    className="flex w-24 flex-col items-center gap-1 rounded-lg border-2 border-dusk bg-indigo/80 px-3 py-3 sm:w-28"
                  >
                    <span className="font-mono text-[11px] font-bold uppercase text-lavender">
                      {prize.place}th
                    </span>
                    <span className="font-mono text-sm text-zzz">
                      ${prize.amount.toLocaleString('en-US')}
                    </span>
                  </li>
                ) : null,
              )}
            </ol>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-8 text-center">
              <p className="text-body-md text-lavender">{PRIZES_SECTION.prizeCardTitle}</p>
              <div className="mt-4">
                <SlotRoll
                  amount={100_000}
                  label="Grand prize"
                />
              </div>
              {sponsorClause ? (
                <p className="mt-4 font-mono text-sm text-mint">{sponsorClause}</p>
              ) : null}
            </GlassCard>

            <div className="rounded-lg border-[3px] border-ink bg-cream p-8 text-ink [box-shadow:10px_10px_0_var(--color-zzz)]">
              <h3 className="font-display text-2xl font-black uppercase">{PRICE_CARD.title}</h3>
              <p className="mt-3 font-mono text-4xl font-bold">
                ${PRICE_CARD.total}
              </p>
              <ul className="mt-5 space-y-2">
                {PRICE_CARD.lines.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-body-sm">
                    <span aria-hidden="true" className="mt-1 text-pillow">
                      ●
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t-2 border-dashed border-ink/20 pt-4 text-body-sm font-bold">
                {PRICE_CARD.refundLine}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}