import { TIMELINE } from '@/content/site';

/**
 * "From reserve to wake-up call".
 *
 * One timeline, used in both the places it appears (beside the form and on the
 * ticket). The previous build had two separate lists saying overlapping things,
 * which is how a $39.99 payment ends up looking like three different amounts.
 *
 * Horizontal on desktop with hairline connectors, a stacked list on mobile.
 * Mono numerals throughout, because this is a sequence of numbers as much as it
 * is a sequence of words.
 */
export function Timeline({
  className = '',
  heading = true,
  columns = 3,
}: {
  readonly className?: string;
  /** Off on the ticket, where the heading is already there. */
  readonly heading?: boolean;
  /**
   * Column count at desktop. The timeline sits in two very different places:
   * full width beside the form, and inside a narrow sticky sidebar. At three
   * columns in a 360px sidebar every heading wrapped to two words per line.
   */
  readonly columns?: 1 | 3;
}) {
  const grid =
    columns === 1
      ? 'grid gap-x-6 gap-y-7'
      : 'grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={className}>
      {heading ? (
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-paper">
          {TIMELINE.heading}
        </h3>
      ) : null}

      <ol className={`mt-6 ${grid}`}>
        {TIMELINE.steps.map((step, index) => (
          <li key={step.title} className="relative pl-9">
            {/* The connector and the numeral share one track, so the line always
                meets the number regardless of the title's length. */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-0.5 grid size-6 place-items-center rounded-full border border-white/20 bg-ink font-mono text-[11px] text-tungsten"
            >
              {index + 1}
            </span>
            {index < TIMELINE.steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-3 top-7 h-[calc(100%+0.5rem)] w-px bg-gradient-to-b from-white/15 to-transparent ${
                  columns === 1 ? 'hidden' : 'hidden lg:block'
                }`}
              />
            ) : null}

            <p className="font-mono text-xs uppercase tracking-[0.12em] text-paper">
              {step.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-mist">{step.detail}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-mist/75">
        {TIMELINE.dateAnnouncedAt}
      </p>
    </div>
  );
}