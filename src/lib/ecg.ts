/**
 * ECG path generation.
 *
 * The old heartbeat was a decorative zigzag. This draws an actual
 * electrocardiogram trace: a flat baseline, a small rounded P wave, a sharp
 * QRS complex (a small downward Q, a tall narrow R spike, a deeper S below the
 * line), and a broad rounded T wave, repeating once per beat.
 *
 * Everything is expressed in a fixed 1000x200 viewBox so the server and client
 * render byte-identical geometry and the line never jumps on hydration.
 */

export const ECG_WIDTH = 1000;
export const ECG_HEIGHT = 200;
export const ECG_BASELINE = 100;

/** Normalised shape of one beat, as [x, y] with y in 0..1 of the height. */
type Point = readonly [number: number, y: number];

const BEAT: readonly Point[] = [
  [0.0, 0.5],
  // P wave: small, rounded, before the complex.
  [0.06, 0.5],
  [0.09, 0.42],
  [0.12, 0.5],
  [0.2, 0.5],
  // Q: a shallow dip below the line.
  [0.23, 0.5],
  [0.25, 0.58],
  // R: the tall narrow spike. This is the part the eye reads as a heartbeat.
  [0.28, 0.5],
  [0.31, 0.06],
  [0.34, 0.5],
  // S: below the line, the mirror of R.
  [0.37, 0.72],
  [0.4, 0.5],
  // ST segment, then a broad rounded T wave.
  [0.48, 0.5],
  [0.55, 0.38],
  [0.62, 0.38],
  [0.69, 0.5],
  [0.76, 0.5],
];

/**
 * Builds a continuous path across `beats` cycles.
 *
 * @param amplitude Peak height of the R spike, in viewBox units. Smaller reads
 *                  as calmer, which is the point: a line that jitters like an
 *                  alarm clock contradicts "asleep".
 */
export function ecgPath(beats: number, amplitude = 78): string {
  const count = Math.max(1, Math.floor(beats));
  const step = ECG_WIDTH / count;
  const scale = amplitude / 0.44; // 0.5 - 0.06 is the tallest excursion

  const y = (value: number): string =>
    (ECG_BASELINE - (value - 0.5) * scale).toFixed(2);

  let d = `M0 ${y(BEAT[0]![1])}`;
  for (let beat = 0; beat < count; beat += 1) {
    const origin = beat * step;
    for (let i = 1; i < BEAT.length; i += 1) {
      const [offset, value] = BEAT[i]!;
      d += ` L${(origin + offset * step).toFixed(2)} ${y(value)}`;
    }
  }
  d += ` L${ECG_WIDTH} ${y(0.5)}`;
  return d;
}

/**
 * A single flat baseline, used for the registered portion: progress that has
 * happened should look calm and settled, and the live trace is what is still to
 * come.
 */
export function flatPath(toX: number): string {
  return `M0 ${ECG_BASELINE} L${Math.max(0, Math.min(ECG_WIDTH, toX)).toFixed(2)} ${ECG_BASELINE}`;
}

/** The matching filled area, for the subtle glow under the trace. */
export function areaPath(toX: number): string {
  const x = Math.max(0, Math.min(ECG_WIDTH, toX)).toFixed(2);
  return `M0 ${ECG_BASELINE} L${x} ${ECG_BASELINE} L${x} ${ECG_HEIGHT} L0 ${ECG_HEIGHT} Z`;
}