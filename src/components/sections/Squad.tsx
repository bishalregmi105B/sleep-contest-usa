import { ROUNDS, SQUAD } from '@/content/site';
import { Plate } from '@/components/media/Plate';
import { HeartStrip } from '@/components/ui/HeartStrip';
import { Card } from '@/components/ui/Card';
import { RoundsReplay } from './RoundsReplay';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S4 Wake-up squad.
 *
 * Midnight, not sunrise. The previous build painted this whole section a
 * saturated orange-to-yellow gradient, which was the single most cartoon
 * signal on the page: a night event lit by practical work lights, not a
 * daylight scene.
 *
 * Cards are square to the page, hairline-bordered, with a duotone wash. Each
 * round's image matches its own caption, which the old build did not manage
 * (round 1 showed an arena floor, round 3 showed a leaderboard screen).
 */
export function Squad() {
  return (
    <section id="squad" aria-labelledby="squad-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading
          title={SQUAD.heading}
          sub={`${SQUAD.sub} ${SQUAD.body}`}
          as="h2"
        />

        <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3" data-testid="squad-rounds">
          {ROUNDS.map((round, index) => (
            <li key={round.title}>
              <Card className="flex h-full flex-col overflow-hidden" interactive>
                <Plate
                  assetKey={round.asset}
                  alt={round.alt}
                  className="aspect-3/2 w-full"
                  sizes="(min-width: 768px) 33vw, 100vw"
                  caption={`Round ${index + 1}`}
                  /*
                    Until the photograph exists, the slot becomes a typographic
                    numeral rather than an unlit 3:2 rectangle. Three identical
                    empty boxes stacked side by side read as three broken cards.
                  */
                  missing={
                    <div className="flex h-full min-h-32 items-center justify-center border-b border-white/10 bg-ink/40">
                      <span
                        aria-hidden="true"
                        className="font-display text-5xl font-extrabold leading-none text-white/[0.06]"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  }
                />

                <div className="flex flex-1 flex-col gap-2 p-6">
                  <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-wide text-paper">
                    {round.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-mist">{round.body}</p>
                  <div className="mt-auto pt-5">
                    <HeartStrip label={SQUAD.stripLabel} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <RoundsReplay />
        </div>

        <Telemetry />
      </div>
    </section>
  );
}

/**
 * An honest illustration of what a winning night looks like: a heart rate that
 * drops, holds steady, and spikes briefly at each wake-up round.
 *
 * The legend says plainly that it is not real data, because an invented chart
 * next to a real prize claim is exactly the kind of thing that costs a contest
 * its credibility. The scoring sentence beside it is the actual rule.
 */
function Telemetry() {
  return (
    <Card className="mt-12 p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
        <figure>
          <figcaption className="font-display text-lg font-bold uppercase tracking-wide text-paper">
            {SQUAD.telemetryTitle}
          </figcaption>

          <svg
            viewBox="0 0 600 160"
            preserveAspectRatio="none"
            className="mt-4 block h-32 w-full"
            role="img"
            aria-label="Illustrative heart-rate trace: it falls at the start, holds steady, and spikes briefly at three points."
          >
            <defs>
              <linearGradient id="telemetry-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#35F2B0" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#35F2B0" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* The trace. Three spikes mark the wake-up rounds. */}
            <path
              d="M0 40 C60 44, 90 96, 150 104 C230 116, 300 112, 340 110 L360 96 L370 126 L380 110 L460 110 L480 92 L490 130 L500 110 L600 110 L600 160 L0 160 Z"
              fill="url(#telemetry-fill)"
            />
            <path
              d="M0 40 C60 44, 90 96, 150 104 C230 116, 300 112, 340 110 L360 96 L370 126 L380 110 L460 110 L480 92 L490 130 L500 110 L600 110"
              fill="none"
              stroke="var(--color-mint)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Round markers, in mono so they read as data. */}
            {[370, 485, 560].map((x, i) => (
              <g key={x}>
                <line
                  x1={x}
                  y1={8}
                  x2={x}
                  y2={152}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.25"
                  className="text-tungsten"
                />
                <text
                  x={x}
                  y={158}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[9px] text-mist/60"
                >
                  {`+${(i + 1) * 20}m`}
                </text>
              </g>
            ))}
          </svg>

          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mist/50">
            {SQUAD.telemetryCaption}
          </p>
        </figure>

        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-tungsten/80">
            How it is judged
          </h3>
          <p className="mt-3 text-lg leading-relaxed text-paper">{SQUAD.scoring}</p>
        </div>
      </div>
    </Card>
  );
}