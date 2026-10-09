import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Guinness World Records "Official Attempt" badge.
 *
 * ## This renders nothing until the client has written approval
 *
 * The client says the contest is a Guinness World Records official attempt and
 * supplied the logo. Guinness World Records requires a licence for any
 * commercial use of its name or logos; the Official Record Attempt mark is for
 * promoting an attempt you have registered; and receiving attempt guidelines is
 * not the same as being cleared to attempt. So the badge is built but gated
 * behind `gwrEnabled`, which the admin form refuses to turn on without a
 * written approval reference and a date.
 *
 * With the flag off, no logo is fetched and no "Guinness" or "world record"
 * wording appears anywhere on the site. `scripts/check-integrity.mjs` enforces
 * that at build time, and `tests/integration/gwr-gate.test.ts` asserts it on a
 * rendered page.
 *
 * ## Why it is a server component reading the filesystem
 *
 * The asset must be proven to exist before it is rendered, and the check has to
 * happen on the server. A client-side `onError` would still emit the request and
 * still flash a broken image on a page that takes money.
 */

const CANDIDATES = [
  '/assets/brand/gwr-official-attempt.webp',
  '/assets/brand/gwr-official-attempt.png',
];

export type GwrBadgeProps = {
  /** Mirrors the `gwrEnabled` setting. */
  readonly enabled: boolean;
  readonly className?: string;
  /** `inline` is a smaller plate, for the footer and the rules-page header. */
  readonly variant?: 'card' | 'inline';
};

type BrandAsset = { width: number; height: number };

/**
 * Intrinsic size, recorded by `npm run assets:brand`.
 *
 * Read rather than hardcoded. The supplied logo is 1248x455, roughly 2.7:1; a
 * guessed 4:3 reservation either squashes the mark or leaves a wide blank band
 * under it, and the aspect ratio is also what stops the page shifting when the
 * image loads.
 */
let intrinsic: BrandAsset | null | undefined;

function intrinsicSize(): BrandAsset | null {
  if (intrinsic !== undefined) return intrinsic;
  try {
    const manifest = JSON.parse(
      readFileSync(path.join(process.cwd(), 'public/assets/brand/brand.json'), 'utf8'),
    ) as Record<string, BrandAsset>;
    const entry = manifest['gwr-official-attempt'];
    intrinsic = entry && entry.width > 0 && entry.height > 0 ? entry : null;
  } catch {
    // No manifest. Fall back to reading the PNG header rather than guessing a
    // ratio, so a hand-dropped file still renders correctly.
    intrinsic = readPngSize(path.join(process.cwd(), 'public/assets/brand/gwr-official-attempt.png'));
  }
  return intrinsic;
}

/** PNG dimensions are two big-endian uint32s at byte 16, per the spec. */
function readPngSize(file: string): BrandAsset | null {
  try {
    const buffer = readFileSync(file);
    if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/**
 * Resolves the asset once per process.
 *
 * Reading the filesystem at render time on every request would stat a file per
 * render; the answer cannot change without a deploy.
 */
let resolved: string | null | undefined;

function resolveAsset(): string | null {
  if (resolved !== undefined) return resolved;
  const publicDir = path.join(process.cwd(), 'public');
  resolved =
    CANDIDATES.find((candidate) => existsSync(path.join(publicDir, candidate.replace(/^\//, '')))) ?? null;

  if (!resolved) {
    // Loud, and exactly once per process.
    //
    // The setting is on but nothing renders, which otherwise presents as
    // "the badge is broken" rather than "the file is missing". This is the
    // single most likely reason the badge would not appear, so it is worth an
    // error line rather than silence.
    console.error(
      `[gwr] The record-attempt badge is enabled but no asset was found.\n` +
        `      Looked for: ${CANDIDATES.join(', ')}\n` +
        '      Drop the client\'s logo at public/assets/brand/gwr-official-attempt.png and run `npm run assets:brand`.',
    );
  }

  return resolved;
}

/**
 * Renders the badge, or nothing.
 *
 * Always on a solid light plate: the logo is navy text on white with wide
 * margins, so putting it on a dark or photographic background destroys both the
 * mark and its required clear space.
 */
export function GwrBadge({ enabled, className = '', variant = 'card' }: GwrBadgeProps) {
  if (!enabled) return null;

  const src = resolveAsset();
  // No asset, no badge. Never a broken image, and never the word "Guinness"
  // alone in place of the mark it refers to.
  if (!src) return null;

  const size = intrinsicSize();
  // The inline variant is a smaller rendering of the same mark. Width follows
  // from the real ratio rather than being set independently, so the mark is
  // never stretched.
  const maxHeight = variant === 'inline' ? 48 : 78;
  const maxWidth = size ? Math.round((maxHeight * size.width) / size.height) : maxHeight * 3;

  return (
    <div
      className={
        [
          'inline-flex items-center justify-center rounded-lg bg-white',
          variant === 'inline' ? 'px-3 py-1.5' : 'px-4 py-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')
      }
      // The clear space around the mark, and the solid plate, are part of the
      // licence conditions, so they are set on the wrapper rather than left to
      // whatever background happens to be behind it.
      style={{ boxShadow: 'inset 0 0 0 1px rgba(11,16,32,0.08)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic ratio is
          unknown until the asset is processed; next/image would reserve space
          with a guessed ratio and shift the layout on load. */}
      <img
        src={src}
        alt="Guinness World Records Official Attempt"
        width={size?.width}
        height={size?.height}
        loading="lazy"
        decoding="async"
        className="h-auto w-auto"
        style={{ maxHeight: `${maxHeight}px`, maxWidth: `${maxWidth}px` }}
      />
    </div>
  );
}
