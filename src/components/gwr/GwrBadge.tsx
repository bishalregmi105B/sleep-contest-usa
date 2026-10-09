import { existsSync } from 'node:fs';
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
};

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
  return resolved;
}

/**
 * Renders the badge, or nothing.
 *
 * Always on a solid light plate: the logo is navy text on white with wide
 * margins, so putting it on a dark or photographic background destroys both the
 * mark and its required clear space.
 */
export function GwrBadge({ enabled, className = '' }: GwrBadgeProps) {
  if (!enabled) return null;

  const src = resolveAsset();
  // No asset, no badge. Never a broken image, and never the word "Guinness"
  // alone in place of the mark it refers to.
  if (!src) return null;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg bg-white px-6 py-4 ${className}`.trim()}
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
        width={240}
        height={180}
        loading="lazy"
        decoding="async"
        className="h-auto w-auto max-w-[240px]"
      />
    </div>
  );
}
