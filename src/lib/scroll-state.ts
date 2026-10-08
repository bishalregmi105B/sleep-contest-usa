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
  /** Normalised pointer position, -1 to 1 on both axes. */
  pointer: { x: 0, y: 0 },
  tier: 'med' as Tier,
  /** False when the tab is hidden or the scene is not needed. */
  active: true,
};

export type SceneState = {
  readonly id: string;
  /** Camera position. */
  readonly camera: readonly [number, number, number];
  /** Camera look-at target. */
  readonly lookAt: readonly [number, number, number];
  /** Sky gradient, bottom to top. */
  readonly sky: readonly [string, string, string];
};

/**
 * Scene states, keyed by section id. Scrolling interpolates between them with
 * damping, so the sky and camera never snap.
 */
export const SCENE_STATES: Record<string, SceneState> = {
  hero: {
    id: 'hero',
    camera: [0.8, 0.5, 7.5],
    lookAt: [0.4, 0.2, 0],
    sky: ['#FF9A3C', '#FF4F8B', '#3A2C78'],
  },
  counter: {
    id: 'counter',
    camera: [0.2, 0.4, 7.2],
    lookAt: [0, 0, 0],
    // Deliberately deeper than the hero: the first screen carries the bright
    // dusk pink, and by the counter we are already sliding toward midnight.
    sky: ['#C9457F', '#4A2470', '#150E38'],
  },
  how: {
    id: 'how',
    camera: [-2.5, 0.5, 6],
    lookAt: [-2.5, 0, 0],
    sky: ['#3A2C78', '#241B55', '#0B0620'],
  },
  squad: {
    id: 'squad',
    camera: [0, 0.2, 5],
    lookAt: [0, 0, 0],
    sky: ['#1B1450', '#140F2A', '#0B0620'],
  },
  prizes: {
    id: 'prizes',
    camera: [0, 1.0, 8.5],
    lookAt: [0, 0.5, 0],
    sky: ['#0B0620', '#1B1450', '#2A1F63'],
  },
  gallery: {
    id: 'gallery',
    camera: [0.3, 0.3, 7.5],
    lookAt: [0, 0, 0],
    sky: ['#0B0620', '#0F0A24', '#140F2A'],
  },
  reserve: {
    id: 'reserve',
    camera: [0, 0.4, 6.5],
    lookAt: [0, 0, 0],
    sky: ['#3A2C78', '#8A5A8C', '#FF9A3C'],
  },
  faq: {
    id: 'faq',
    camera: [0, 0.4, 7],
    lookAt: [0, 0.2, 0],
    // Pre-dawn hold: the sky is still lifting while the questions are answered.
    sky: ['#4A2470', '#7A3F7E', '#B4528C'],
  },
  cta: {
    id: 'cta',
    camera: [0, 0.8, 6.8],
    lookAt: [0, 0.4, 0],
    sky: ['#FF4F8B', '#FF9A3C', '#FFE14A'],
  },
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

/** Resolves the scene state for a section id, falling back to the hero. */
export function sceneStateFor(id: string): SceneState {
  return SCENE_STATES[id] ?? SCENE_STATES.hero!;
}