'use client';

import { useId } from 'react';

type HeartbeatLineProps = {
  /** Filled mint from the left up to this fraction. */
  readonly value: number;
  readonly max: number;
  /** Accessible description, e.g. "Sleepers registered so far". */
  readonly label: string;
  readonly className?: string;
};

const W = 600;
const H = 60;

/**
 * One ECG trace. The filled portion is flat mint, the remainder spikes in
 * lavender, and a moon marker sits where the two meet.
 *
 * The spikes are generated from a fixed template so the shape is identical on
 * server and client and never shifts between renders.
 */
const SPIKES = [
  'M0 30',
  'L40 30',
  'L52 30 L60 8 L68 46 L74 30',
  'L86 30',
  'L96 30 L102 14 L110 48 L118 30',
  'L132 30',
  'L146 30 L152 22 L158 38 L164 30',
  'L178 30',
  'L186 30 L192 10 L200 48 L208 30',
  'L222 30',
  'L238 30 L244 16 L252 46 L258 30',
  'L272 30',
  'L284 30 L290 20 L296 40 L302 30',
  'L316 30',
  'L330 30 L336 12 L344 48 L352 30',
  'L366 30',
  'L380 30 L386 18 L392 42 L398 30',
  'L412 30',
  'L426 30 L432 8 L440 46 L448 30',
  'L462 30',
  'L478 30 L484 16 L492 46 L498 30',
  'L512 30',
  'L526 30 L532 20 L538 40 L544 30',
  'L558 30',
  'L572 30 L578 10 L586 48 L594 30',
  'L600 30',
].join(' ');

/** Where the progress boundary sits in the same 600-unit space. */
function xForFraction(fraction: number) {
  return Math.max(0, Math.min(1, fraction)) * W;
}

export function HeartbeatLine({ value, max, label, className = '' }: HeartbeatLineProps) {
  const clipId = useId();
  const fraction = max > 0 ? value / max : 0;
  const boundaryX = xForFraction(fraction);
  const percentage = Math.round(fraction * 100);

  // The registered portion is the flat baseline; the spiking remainder is what
  // is still to come.
  const flatPath = `M0 30 L${boundaryX} 30`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-16 w-full overflow-visible sm:h-20"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value.toLocaleString('en-US')} of ${max.toLocaleString('en-US')} (${percentage}%)`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={boundaryX} height={H} />
          </clipPath>
        </defs>

        {/* Remaining: awake, spiky, lavender. */}
        <path
          d={SPIKES}
          fill="none"
          stroke="var(--color-lavender)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
          vectorEffect="non-scaling-stroke"
        />

        {/* Registered: asleep, flat, mint. */}
        <path
          d={flatPath}
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="3.5"
          strokeLinecap="round"
          clipPath={`url(#${clipId})`}
          vectorEffect="non-scaling-stroke"
        />

        {/* The moon marker sitting exactly on the boundary. */}
        <g transform={`translate(${boundaryX} 30)`}>
          <circle r="9" fill="var(--color-zzz)" stroke="var(--color-ink)" strokeWidth="2" />
          <circle cx="-2.5" cy="-1" r="1.1" fill="var(--color-ink)" />
          <circle cx="2.5" cy="-1" r="1.1" fill="var(--color-ink)" />
          <path
            d="M-3 3 Q0 5.5 3 3"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}