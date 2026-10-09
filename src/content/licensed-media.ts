/**
 * Licensed-media gate.
 *
 * Any third-party image used on the site must be declared here with its licence
 * and proof of right. `scripts/check-media.mjs` runs in `prebuild` and in CI and
 * fails the build if an image in `public/` is not declared, or if an entry is
 * missing a required field.
 *
 * The gate is empty at the moment, which is a valid and deliberate state: the
 * site uses only imagery this project generated itself and assets the client
 * owns. See `world-context.ts` for why third-party event photos and logos are
 * not being used.
 *
 * Adding an entry looks like this:
 *
 * ```ts
 * {
 *   src: '/assets/world/madrid-siestas.webp',
 *   license: 'CC BY 4.0',
 *   attribution: 'Author Name, via Wikimedia Commons',
 *   sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
 *   proofOfRight: 'Commons page records the author’s release; retrieved 2026-10-09.',
 *   usageNotes: 'Used once, with attribution, in the world section. Not cropped into.',
 * }
 * ```
 *
 * Permitted sources: Wikimedia Commons with its stated licence and attribution,
 * purchased stock, the client's own photography, or clearly labelled AI concept
 * visuals. Never scraped from a search engine.
 */

export type LicensedMediaEntry = {
  /** Path under `public/`, exactly as referenced in code. */
  readonly src: string;
  /** SPDX identifier or the licence name, e.g. `CC BY 4.0`, `CC0`, `Purchased`, `Client-owned`. */
  readonly license: string;
  /** What must be shown, and to whom. Empty string is only valid for CC0 and client-owned work. */
  readonly attribution: string;
  readonly sourceUrl: string;
  /** Where the right to use it is evidenced: receipt id, permission note, or licence page. */
  readonly proofOfRight: string;
  /** Where it appears and how. Cropping or recolouring a logo is prohibited. */
  readonly usageNotes: string;
};

export const LICENSED_MEDIA: readonly LicensedMediaEntry[] = [];
