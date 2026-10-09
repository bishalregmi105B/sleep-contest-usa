'use client';

import { useId } from 'react';
import {
  ECG_BASELINE,
  ECG_HEIGHT,
  ECG_WIDTH,
  areaPath,
  ecgPath,
  flatPath,
} from '@/lib/ecg';

/**
 * The registration progress, drawn as an electrocardiogram.
 *
 * The registered portion is a flat line: progress that has happened should look
 * settled. The remainder is a live ECG trace, because that is what is still to
 * come. A mint dot sits on the boundary. There is no moon marker — the previous
 * version put a smiling moon face here, which is exactly the cartoon tell the
 * realism pass removes.
 *
 * The ECG-paper grid behind it is decorative and hidden from assistive tech;
 * the progressbar role carries the actual value.
 */
export function EcgLine({
  value,
  max,
  label,
  className = '',
  /** Hides the number entirely. Used below the public counter threshold. */
  hideValue = false,
  beats = 12,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly className?: string;
  readonly hideValue?: boolean;
  readonly beats?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `ecg-clip-${uid}`;
  const glowId = `ecg-glow-${uid}`;

  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const boundaryX = fraction * ECG_WIDTH;
  const percentage = Math.round(fraction * 100);

  const summary = hideValue
    ? label
    : `${label}: ${value.toLocaleString('en-US')} of ${max.toLocaleString('en-US')} (${percentage}%)`;

  return (
    <div className={className}>
      <div className="ecg-grid relative overflow-hidden rounded-md border border-white/5 bg-ink/40">
        <svg
          viewBox={`0 0 ${ECG_WIDTH} ${ECG_HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-20 w-full sm:h-24"
          role="progressbar"
          aria-valuenow={hideValue ? undefined : value}
          aria-valuemin={hideValue ? undefined : 0}
          aria-valuemax={hideValue ? undefined : max}
          aria-label={summary}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={boundaryX} height={ECG_HEIGHT} />
            </clipPath>
            <filter id={glowId} x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* The future: a live trace at low contrast. */}
          <path
            d={ecgPath(beats)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
            className="text-mist"
          />

          {/* The past: settled, flat, mint. */}
          {fraction > 0 ? (
            <g clipPath={`url(#${clipId})`}>
              <path
                d={areaPath(boundaryX)}
                fill="var(--color-mint)"
                opacity="0.08"
              />
              <path
                d={flatPath(boundaryX)}
                fill="none"
                stroke="var(--color-mint)"
                strokeWidth="3"
                strokeLinecap="round"
                filter={`url(#${glowId})`}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}

          {/* The boundary, marked by a live pulse rather than a character. */}
          {fraction > 0 && fraction < 1 ? (
            <g transform={`translate(${boundaryX} ${ECG_BASELINE})`}>
              <circle r="7" fill="var(--color-mint)" opacity="0.25" />
              <circle r="3.5" fill="var(--color-mint)" />
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}