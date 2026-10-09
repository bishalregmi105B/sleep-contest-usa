'use client';

import { useEffect, useRef } from 'react';
import { gsap, registerGsap } from '@/lib/gsap';
import { blendSky, skyStyle } from '@/lib/cinematic';
import { scrollState, SEQUENCE_MAP } from '@/lib/scroll-state';
import { prefersReducedMotion } from '@/lib/quality';
import { CINE_KEYS, asset } from '@/lib/assets';

/**
 * Where each keyframe sits in the whole scroll.
 *
 * Fractions rather than frame indices, so the map stays valid whether the
 * sequence is drawn from six stills or from a few hundred extracted frames.
 */
const ANCHORS: readonly number[] = [0.06, 0.21, 0.4, 0.56, 0.74, 0.93];

/**
 * Half-width of the crossfade, in scroll fraction.
 *
 * Wide on purpose: the two photographs overlap across roughly a third of the
 * distance between their anchors, which is long enough for the change to read
 * as a dissolve rather than as a cut.
 */
const BLEND = 0.26;

/** How fast a frame chases its target opacity. Higher is snappier. */
const EASE = 7;

/**
 * Layer 0 of the page stack.
 *
 * A fixed, full-screen sky that moves from dusk to midnight to sunrise as the
 * visitor scrolls, driven from the mutable scroll state on the GSAP ticker so it
 * never re-renders React.
 *
 * Three things keep the transition smooth rather than snappy:
 *
 *  1. Every photograph **eases towards** its target opacity instead of jumping
 *     to it, so even a fast flick dissolves.
 *  2. A style is only written once the value has moved enough to be visible, so
 *     a slow scroll costs nothing.
 *  3. The CSS gradient underneath is repainted only while it is actually on
 *     show, not sixty times a second behind six opaque photographs.
 *
 * Nothing here is interactive, so it is `aria-hidden` and never takes focus.
 */
export function CinematicStage() {
  const layerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<Array<HTMLDivElement | null>>([]);

  const frames = CINE_KEYS.map((key) => asset(key));

  /**
   * Whether each photograph has been requested from the network yet.
   *
   * Six 2400px keyframes are about a megabyte together, so only the hero frame
   * is fetched up front and the rest are armed when the scroll comes near them.
   */
  const armed = useRef<boolean[]>(frames.map((_frame, i) => i === 0));
  /** The opacity actually on screen, which eases towards the target. */
  const shown = useRef<number[]>(frames.map((_frame, i) => (i === 0 ? 1 : 0)));
  /** The last value written to the DOM, so no-op writes are skipped. */
  const written = useRef<number[]>(frames.map(() => -1));

  useEffect(() => {
    registerGsap();

    const layer = layerRef.current;
    const glow = glowRef.current;
    if (!layer) return;

    let lastSection = '';

    /** The CSS sky: the fallback, and the wash whenever no photo is at full. */
    const paintSky = () => {
      const { id, t } = scrollState.section;
      const phase = blendSky(id, t);

      const style = skyStyle(phase, scrollState.progress);
      layer.style.backgroundImage = style.backgroundImage as string;
      layer.style.backgroundPosition = style.backgroundPosition as string;

      if (glow) {
        glow.style.background = `radial-gradient(46% 20% at 50% 98%, ${phase.glow} 0%, transparent 72%)`;
        glow.style.opacity = String(phase.glowStrength);
      }

      lastSection = id;
    };

    const tick = (_time: number, delta: number) => {
      const { id } = scrollState.section;
      const dim = SEQUENCE_MAP[id]?.dim ?? 1;
      const p = scrollState.sequenceProgress;

      let strongest = 0;

      for (let i = 0; i < framesRef.current.length; i += 1) {
        const node = framesRef.current[i];
        if (!node || !frames[i]?.exists) continue;

        const distance = Math.abs(p - (ANCHORS[i] ?? 0));

        // Arm the frame a little before it is needed, so it has decoded by the
        // time it is on screen rather than fading up from blank.
        if (!armed.current[i] && distance < 0.5) {
          armed.current[i] = true;
          node.style.backgroundImage = `url(${frames[i]!.src})`;
        }

        const target = Math.max(0, 1 - distance / BLEND) * dim;

        // Ease towards the target, frame-rate independent, so the dissolve
        // takes the same time on a 60Hz and a 144Hz display.
        const k = 1 - Math.exp(-EASE * Math.min(0.1, delta));
        shown.current[i] += (target - shown.current[i]!) * k;
        const next = shown.current[i]!;

        strongest = Math.max(strongest, next);

        if (Math.abs(next - written.current[i]!) < 0.004) continue;
        written.current[i] = next;

        node.style.opacity = next.toFixed(3);
        node.style.visibility = next > 0.004 ? 'visible' : 'hidden';
      }

      // Held sections (prizes, gallery) share the squad frame and dim it, so
      // the page reads as one continuous night rather than a slideshow.
      if (strongest < 0.92 || id !== lastSection) paintSky();
    };

    paintSky();

    // Reduced motion still gets the dusk-to-dawn arc, but on a plain scroll
    // handler rather than the ticker, so nothing eases or animates on its own.
    if (prefersReducedMotion()) {
      const paintFrames = () => {
        for (let i = 0; i < framesRef.current.length; i += 1) {
          const node = framesRef.current[i];
          if (!node || !frames[i]?.exists) continue;
          const target = Math.max(
            0,
            1 - Math.abs(scrollState.sequenceProgress - (ANCHORS[i] ?? 0)) / BLEND,
          );
          node.style.opacity = String(target);
          node.style.visibility = target > 0.004 ? 'visible' : 'hidden';
        }
      };
      paintFrames();
      window.addEventListener('scroll', paintSky, { passive: true });
      window.addEventListener('scroll', paintFrames, { passive: true });
      return () => {
        window.removeEventListener('scroll', paintSky);
        window.removeEventListener('scroll', paintFrames);
      };
    }

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [frames]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Photographs sit above the gradient, which is both their fallback and
          the wash that keeps text legible over any frame. */}
      <div ref={layerRef} className="absolute inset-0" />

      {frames.map((frame, i) =>
        frame.exists ? (
          <div
            key={CINE_KEYS[i]}
            ref={(node) => {
              framesRef.current[i] = node;
            }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: i === 0 ? `url(${frame.src})` : undefined,
              opacity: i === 0 ? 1 : 0,
              visibility: i === 0 ? 'visible' : 'hidden',
              // Promoted to its own compositor layer, so a crossfade is a GPU
              // blend rather than a repaint of the whole stage every frame.
              willChange: 'opacity',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          />
        ) : null,
      )}

      {/* A bottom-up ink wash. Every photograph is night-lit, so this is what
          carries the contrast rather than a flat grey overlay. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(7,6,15,0.88) 0%, rgba(7,6,15,0.48) 34%, rgba(7,6,15,0.34) 62%, rgba(7,6,15,0.58) 100%)',
        }}
      />

      {/* A soft warm bloom near the horizon, separate so its opacity can move
          independently of the gradient stops. */}
      <div ref={glowRef} className="absolute inset-0 mix-blend-screen" />
    </div>
  );
}