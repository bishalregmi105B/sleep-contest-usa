/**
 * Quality tiers.
 *
 * Decided once on the client from what the device and browser can tell us. The
 * tier caps DPR, particle counts, postprocessing and the frame rate. Unknown
 * defaults to `med`, and mobile never goes above `med`.
 */

export type Tier = 'none' | 'low' | 'med' | 'high';

export const SETTINGS: Record<
  Exclude<Tier, 'none'>,
  {
    readonly dprMax: number;
    readonly stars: number;
    readonly clouds: number;
    readonly coins: number;
    readonly postprocessing: boolean;
    /** Hard frame cap; 0 means uncapped. */
    readonly fpsCap: number;
    readonly backdropBlur: boolean;
  }
> = {
  high: { dprMax: 1.75, stars: 1500, clouds: 6, coins: 60, postprocessing: true, fpsCap: 0, backdropBlur: true },
  med: { dprMax: 1.5, stars: 700, clouds: 3, coins: 30, postprocessing: false, fpsCap: 0, backdropBlur: false },
  low: { dprMax: 1.0, stars: 250, clouds: 0, coins: 0, postprocessing: false, fpsCap: 30, backdropBlur: false },
};

/** WebGL2 support check. Returns false when there is no context at all. */
function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // Release the probe context immediately.
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Chooses a tier. Deliberately conservative: a device that cannot be
 * identified gets `med`, and anything on a phone or with Save-Data on gets no
 * higher than `low` for its class.
 */
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'none';

  if (!supportsWebGL2()) return 'none';

  // Save-Data is an explicit request for less data.
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (connection?.saveData) return 'low';
  if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return 'low';

  // Reduced motion is a request for calm, not for a broken scene: the static
  // night is the right answer there.
  if (prefersReducedMotion()) return 'none';

  const width = window.innerWidth;
  const isMobile = width < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  // Mobile never goes above med, however fast the chip.
  if (isMobile) {
    if (cores <= 4 || memory <= 3) return 'low';
    return 'med';
  }

  if (cores <= 4 || memory <= 4) return 'med';
  if (cores >= 8 && memory >= 8 && width >= 1280) return 'high';
  return 'med';
}

/** Downgrades one step. One-way only, to avoid flip-flopping. */
export function downgrade(tier: Tier): Tier {
  if (tier === 'high') return 'med';
  if (tier === 'med') return 'low';
  return 'none';
}