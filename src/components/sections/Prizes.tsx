import {
  GRAND_PRIZE,
  PRIZES,
  PRIZE_TOTAL,
  PRIZES_SECTION,
  PRICE_CARD,
  sponsorClause,
  usd,
} from '@/content/site';
import { Card } from '@/components/ui/Card';
import { SlotRoll } from './SlotRoll';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S5 Prizes.
 *
 * A typographic ladder on a dark stage rather than a DOM podium. The old
 * podium was three tilted blocks in cartoon metal gradients with a trophy
 * emoji, which read as a toy; the money itself was never the thing that looked
 * cheap. Here the grand prize is a single large numeral in the foil gradient,
 * and places 2 to 5 are a quiet hairline list.
 *
 * The numeral rolls once when it is half in view. Reduced motion shows the
 * final value immediately.
 */
export function Prizes() {
  const runnersUp = PRIZES.filter((prize) => !prize.grand);

  return (
    <section id="prizes" aria-labelledby="prizes-heading" className="section-shell overflow-hidden">
      <SectionScrim />

      {/* One warm beam and a little haze behind the grand prize. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
        style={{
          background:
            'radial-gradient(46% 52% at 32% 44%, rgba(245,215,122,0.10) 0%, transparent 68%)',
        }}
      />

      <div className="content-frame relative z-10">
        <SectionHeading
          title={PRIZES_SECTION.heading}
          sub={PRIZES_SECTION.sub}
          as="h2"
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          {/* The grand prize, on its own stage. */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist/75">
              {PRIZES_SECTION.grandCaption}
            </p>
            <p className="mt-4">
              <SlotRoll amount={GRAND_PRIZE} label={PRIZES_SECTION.grandCaption} />
            </p>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
              {PRIZES_SECTION.prizeCardTitle}
            </p>
            {sponsorClause ? (
              <p className="mt-3 font-mono text-sm text-tungsten/80">{sponsorClause}</p>
            ) : null}

            <div className="mt-10 border-t border-white/10 pt-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist/75">
                {PRIZES_SECTION.totalCaption}
              </p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-paper" data-numeric>
                {usd(PRIZE_TOTAL)}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Places 2 to 5: a ladder, not blocks. */}
            <Card className="p-7">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist/75">
                {PRIZES_SECTION.ladderCaption}
              </h3>
              <ol className="mt-5">
                {runnersUp.map((prize) => (
                  <li
                    key={prize.place}
                    className="flex items-baseline justify-between gap-4 border-t border-white/10 py-3.5 first:border-t-0 first:pt-0"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-mist/75">
                      {prize.label}
                    </span>
                    <span className="font-mono text-lg font-bold tabular-nums text-paper">
                      {usd(prize.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* The price. */}
            <Card className="p-7">
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-paper">
                {PRICE_CARD.title}
              </h3>
              <p className="mt-3 font-mono text-4xl font-bold tabular-nums text-paper" data-numeric>
                ${PRICE_CARD.total}
              </p>
              <ul className="mt-5 space-y-2">
                {PRICE_CARD.lines.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm text-mist">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-tungsten" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-relaxed text-paper">
                {PRICE_CARD.refundLine}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}