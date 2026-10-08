'use client';

/**
 * Miniature heartbeat strip used on each squad card.
 *
 * Deliberately decorative: the round's meaning is in the card copy, so this is
 * hidden from assistive tech rather than announced as a chart.
 */
export function HeartStrip({
  className = '',
  label,
}: {
  readonly className?: string;
  /** Visual caption, already rendered by the parent. */
  readonly label?: string;
}) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        className="h-10 w-full"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M0 20 L40 20 L48 6 L56 32 L62 20 L100 20 L108 8 L116 30 L122 20 L160 20 L168 12 L176 28 L182 20 L200 20"
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {label ? (
        <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-wide text-lavender/80">
          {label}
        </p>
      ) : null}
    </div>
  );
}