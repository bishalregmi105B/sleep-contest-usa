'use client';

import { ECG_HEIGHT, ECG_WIDTH, ecgPath } from '@/lib/ecg';

/**
 * Miniature heartbeat strip used on each squad card and on the ticket.
 *
 * Shares the same generator as the counter, so a heartbeat on the site is the
 * same waveform everywhere. Deliberately decorative: the round's meaning is in
 * the card copy, so this is hidden from assistive tech rather than announced as
 * a chart.
 */
export function HeartStrip({
  className = '',
  label,
  beats = 5,
}: {
  readonly className?: string;
  /** Visual caption, already rendered by the parent. */
  readonly label?: string;
  readonly beats?: number;
}) {
  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${ECG_WIDTH} ${ECG_HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-10 w-full"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={ecgPath(beats, 70)}
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {label ? (
        <p className="mt-1.5 text-center font-mono text-xs uppercase tracking-[0.14em] text-mist font-medium">
          {label}
        </p>
      ) : null}
    </div>
  );
}