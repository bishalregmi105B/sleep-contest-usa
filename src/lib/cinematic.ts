/**
 * The dusk-to-dawn sky, as a scroll-linked gradient.
 *
 * With no raster keyframes shipped, the stage paints a realistic night sky
 * directly in CSS: a real horizon-to-zenith gradient per phase, a low warm glow
 * where the sun or the stadium work lights sit, and a slow drift so the page
 * never feels like a static wallpaper. When the Section 5 keyframes are dropped
 * into `public/assets/images/cine/`, `CinematicStage` switches to drawing those
 * stills instead, with no change here.
 */

/** One phase of the night. Colours are stops, bottom to top. */
export type SkyPhase = {
  readonly id: string;
  /** Lowest stop: the horizon. */
  readonly horizon: string;
  /** Mid stop. */
  readonly mid: string;
  /** Top stop: the zenith. */
  readonly zenith: string;
  /** Colour and strength of the glow near the horizon. */
  readonly glow: string;
  readonly glowStrength: number;
};

export const SKY: Record<string, SkyPhase> = {
  hero: {
    id: 'hero',
    // Dusk. Burnt amber at the horizon falling to deep indigo overhead.
    horizon: '#C9743A',
    mid: '#7A3A5E',
    zenith: '#1B1450',
    glow: '#FFB867',
    glowStrength: 0.18,
  },
  counter: {
    id: 'counter',
    // The last of the dusk, sliding toward midnight.
    horizon: '#8A4A48',
    mid: '#4A2470',
    zenith: '#0B0620',
    glow: '#E8467F',
    glowStrength: 0.07,
  },
  how: {
    id: 'how',
    horizon: '#3A2C78',
    mid: '#241B55',
    zenith: '#0B0620',
    glow: '#7A6BD6',
    glowStrength: 0.05,
  },
  squad: {
    id: 'squad',
    // Midnight, with the warm aisle lights low on the horizon.
    horizon: '#241B55',
    mid: '#140F2A',
    zenith: '#07060F',
    glow: '#FFB867',
    glowStrength: 0.06,
  },
  prizes: {
    id: 'prizes',
    horizon: '#1B1450',
    mid: '#120C36',
    zenith: '#07060F',
    glow: '#F5D77A',
    glowStrength: 0.09,
  },
  gallery: {
    id: 'gallery',
    horizon: '#141040',
    mid: '#0F0A24',
    zenith: '#07060F',
    glow: '#5A4FC0',
    glowStrength: 0.04,
  },
  reserve: {
    id: 'reserve',
    // Blue hour: the mats catch the first cool light.
    horizon: '#2A3A66',
    mid: '#1B2350',
    zenith: '#0B0620',
    glow: '#8FA6D8',
    glowStrength: 0.07,
  },
  faq: {
    id: 'faq',
    horizon: '#3A2C78',
    mid: '#22204F',
    zenith: '#0B0620',
    glow: '#C9743A',
    glowStrength: 0.07,
  },
  cta: {
    id: 'cta',
    // Sunrise. The one warm moment on the page.
    horizon: '#E9A66A',
    mid: '#B4563F',
    zenith: '#2A3A66',
    glow: '#FFB867',
    glowStrength: 0.26,
  },
};

export const SKY_ORDER = [
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

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r} ${g} ${bl})`;
}

/** A sky phase blended toward the next one. `t` is 0 at `id`, 1 at the next. */
export function blendSky(id: string, t: number): SkyPhase {
  const from = SKY[id] ?? SKY.hero!;
  const index = SKY_ORDER.indexOf(id as (typeof SKY_ORDER)[number]);
  const nextId = SKY_ORDER[Math.min(SKY_ORDER.length - 1, index + 1)];
  const to = SKY[nextId] ?? from;
  const k = Math.max(0, Math.min(1, t));
  // Ease the blend so the change does not start the instant a section begins.
  const e = k * k * (3 - 2 * k);

  return {
    id,
    horizon: mix(from.horizon, to.horizon, e),
    mid: mix(from.mid, to.mid, e),
    zenith: mix(from.zenith, to.zenith, e),
    glow: mix(from.glow, to.glow, e),
    glowStrength: from.glowStrength + (to.glowStrength - from.glowStrength) * e,
  };
}

/** The full background stack for a phase, including the horizon glow. */
export function skyStyle(phase: SkyPhase, drift: number): React.CSSProperties {
  const shift = (drift * 4).toFixed(2);
  return {
    backgroundImage: [
      // A slow vignette of warm light sitting just above the horizon line.
      `radial-gradient(90% 34% at 50% 97%, ${phase.glow} 0%, transparent 70%)`,
      `linear-gradient(to top, ${phase.horizon} 0%, ${phase.mid} 42%, ${phase.zenith} 100%)`,
    ].join(', '),
    backgroundPosition: `center ${shift}%, center ${shift}%`,
  };
}