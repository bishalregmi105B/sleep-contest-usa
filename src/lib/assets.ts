import manifest from './assets.generated.json';

/**
 * Asset lookup.
 *
 * `scripts/scan-assets.mjs` writes `assets.generated.json` on predev and
 * prebuild by scanning public/. Components ask for a key and get back whether
 * it exists, so a missing asset renders its fallback instead of a 404.
 */

export type AssetKey =
  | 'hero-poster'
  | 'how-1-register'
  | 'how-2-pajamas'
  | 'how-3-leaderboard'
  | 'how-4-feather'
  | 'squad-noise'
  | 'squad-tickle'
  | 'squad-smell'
  | 'gallery-sleeping-floor'
  | 'gallery-squad-closeup'
  | 'gallery-judge'
  | 'squad-backdrop'
  | 'cta-backdrop'
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
 * signal for the caller to draw a procedural or CSS fallback.
 */
export function asset(key: AssetKey): Asset {
  const hit = table[key];
  return hit ? { src: hit.src, exists: true } : { src: '', exists: false };
}

/** True when the asset is present on disk. */
export function hasAsset(key: AssetKey): boolean {
  return Boolean(table[key]);
}

/** Keys the brief expects but the repo does not ship yet. */
export const MISSING_ASSETS: readonly string[] = [
  'layers/sleeper',
  'layers/moon',
  'layers/zzz',
  'layers/stars',
  'layers/clouds',
  'squad-backdrop',
  'cta-backdrop',
  'trophy-gold',
  'trophy-silver',
  'trophy-bronze',
  'cash-bag',
  'video/hero-loop',
  'video/squad-teaser',
  'video/gallery-1',
  'video/gallery-2',
  'models/sleeper',
  'models/pillow',
  'models/moon',
  'models/zzz',
  'models/air-horn',
  'models/alarm-clock',
  'models/feather',
  'models/bacon',
  'models/trophy',
  'models/podium',
  'audio/lullaby',
  'audio/airhorn',
  'audio/ding',
];