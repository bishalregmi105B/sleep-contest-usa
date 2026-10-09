import type { Tier } from './quality';

/**
 * Mutable scroll state shared between the DOM and the 3D scene.
 *
 * Deliberately a plain module object, not React state: these values change
 * every frame, and routing them through React would re-render the tree 60
 * times a second. ScrollTrigger writes here; `useFrame` reads from here.
 */
export const scrollState = {
  /** Whole-page scroll progress, 0 to 1. */
  progress: 0,
  /** Signed scroll velocity in px/frame, damped. */
  velocity: 0,
  /** Which section is currently dominant, and how far through it we are. */
  section: {
    // Widened to string: ScrollBinder assigns ids from SECTION_ORDER, so the
    // literal type of the initializer would reject them.
    id: 'hero' as string,
    /** 0 at the section's entry, 1 at its exit. */
    t: 0,
  },
  /**
   * Position within the cinematic sequence, 0 to 1, as a fraction of total
   * frames. Any frame count maps onto this, so the sequence map stays valid
   * whether there are 60 frames or 600.
   */
  sequenceProgress: 0,
  /** Normalised pointer position, -1 to 1 on both axes. */
  pointer: { x: 0, y: 0 },
  tier: 'med' as Tier,
  /** False when the tab is hidden or the scene is not needed. */
  active: true,
};

/** Section ids in page order, used to pick the dominant section. */
export const SECTION_ORDER = [
  'hero',
  'counter',
  'how',
  'squad',
  'prizes',
  'gallery',
  'reserve',
  'faq',
  'cta',
] as const;

/**
 * Which part of the cinematic sequence each section plays, as fractions of the
 * whole scroll. `dim` darkens the frame while a section holds on a still, so
 * text always clears the picture behind it.
 */
export const SEQUENCE_MAP: Record<
  string,
  { readonly from: number; readonly to: number; readonly dim?: number }
> = {
  hero: { from: 0.0, to: 0.12 },
  counter: { from: 0.12, to: 0.3 },
  how: { from: 0.3, to: 0.5 },
  squad: { from: 0.5, to: 0.62 },
  // Prizes and gallery hold on the squad frame rather than cutting, so the page
  // reads as one continuous night rather than a slideshow.
  prizes: { from: 0.62, to: 0.62, dim: 0.35 },
  gallery: { from: 0.62, to: 0.62, dim: 0.25 },
  reserve: { from: 0.62, to: 0.85 },
  faq: { from: 0.85, to: 0.92 },
  cta: { from: 0.92, to: 1.0 },
};

/** Index of a section in page order, 0 when unknown. */
export function sectionDepth(id: string = scrollState.section.id): number {
  const index = SECTION_ORDER.indexOf(id as (typeof SECTION_ORDER)[number]);
  return index < 0 ? 0 : index;
}

/**
 * How present something should be: 1 in its own section, 0 everywhere else.
 *
 * The atmosphere is gated on this so stars and the moon never drift over
 * unrelated copy as the page moves.
 */
export function presence(from: string, to: string = from): number {
  const depth = sectionDepth();
  const start = SECTION_ORDER.indexOf(from as (typeof SECTION_ORDER)[number]);
  const end = SECTION_ORDER.indexOf(to as (typeof SECTION_ORDER)[number]);
  if (start < 0 || end < 0) return 0;

  return depth >= start && depth <= end ? 1 : 0;
}

/** Maps whole-page progress onto the sequence, honouring held sections. */
export function sequenceFor(progress: number, id: string): number {
  const entry = SEQUENCE_MAP[id] ?? SEQUENCE_MAP.hero!;
  const p = Math.max(0, Math.min(1, progress));
  return entry.from + (entry.to - entry.from) * p;
}