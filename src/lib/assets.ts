import manifest from './assets.generated.json';

/**
 * Asset lookup.
 *
 * `scripts/scan-assets.mjs` writes `assets.generated.json` on predev and
 * prebuild by scanning public/. Components ask for a key and get back whether
 * it exists, so a missing asset renders its fallback instead of a 404.
 *
 * The site ships with **no** raster images at all. Every key below is expected
 * to be absent until a real photograph is generated (see ASSETS_TO_GENERATE.md)
 * and dropped into public/assets/. The dark cinematic fallback is the intended
 * base state, not a degraded one.
 */

export type AssetKey =
  /* Cinematic keyframes, dusk to dawn. */
  | 'cine/k1'
  | 'cine/k2'
  | 'cine/k3'
  | 'cine/k4'
  | 'cine/k5'
  | 'cine/k6'
  /* Section stills. */
  | 'how-1-register'
  | 'how-2-pajamas'
  | 'how-3-leaderboard'
  | 'how-4-feather'
  | 'squad-noise'
  | 'squad-tickle'
  | 'squad-smell'
  | 'gallery-1'
  | 'gallery-2'
  | 'gallery-3'
  | 'gallery-4'
  | 'gallery-5'
  | 'gallery-6'
  /* Optional video. */
  | 'video/hero-loop'
  /* A public-domain NASA colour map for the moon, if one is dropped in. */
  | 'images/moon-color'
  | (string & {});

export type Asset = {
  readonly src: string;
  readonly exists: boolean;
};

const table = manifest as Record<string, { src: string; bytes: number }>;

/**
 * Resolves an asset key to a public path.
 *
 * Returns `exists: false` when nothing was scanned for that key, which is the
 * signal for the caller to draw the cinematic fallback instead.
 */
export function asset(key: AssetKey): Asset {
  const hit = table[key];
  return hit ? { src: hit.src, exists: true } : { src: '', exists: false };
}

/** True when the asset is present on disk. */
export function hasAsset(key: AssetKey): boolean {
  return Boolean(table[key]);
}

/** How many of the given keys are actually present. Drives the stage's mode. */
export function countPresent(keys: readonly AssetKey[]): number {
  return keys.reduce((n, key) => n + (hasAsset(key) ? 1 : 0), 0);
}

/** The six cinematic keyframes, in the order the scroll sequence uses them. */
export const CINE_KEYS = [
  'cine/k1',
  'cine/k2',
  'cine/k3',
  'cine/k4',
  'cine/k5',
  'cine/k6',
] as const satisfies readonly AssetKey[];