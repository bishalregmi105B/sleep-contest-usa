'use client';

import { useEffect, useRef } from 'react';
import { gsap, registerGsap } from '@/lib/gsap';
import { blendSky, skyStyle } from '@/lib/cinematic';
import { scrollState } from '@/lib/scroll-state';
import { prefersReducedMotion } from '@/lib/quality';

/**
 * Layer 0 of the page stack.
 *
 * A fixed, full-screen sky that moves through dusk, midnight and sunrise as the
 * visitor scrolls, driven from the mutable scroll state on the GSAP ticker so it
 * never re-renders React.
 *
 * This is the deliberate base state. The site ships with no raster imagery, so
 * instead of a placeholder box or, worse, an illustration, the page reads as a
 * dark cinematic night that is lit rather than decorated. When the Section 5
 * keyframes are generated they are picked up by `assets:scan` and
 * `FrameLayer` below takes over automatically.
 *
 * Nothing here is interactive, so it is `aria-hidden` and never receives focus.
 */
export function CinematicStage() {
  const layerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();

    const layer = layerRef.current;
    const glow = glowRef.current;
    if (!layer) return;

    const paint = () => {
      const { id, t } = scrollState.section;
      const phase = blendSky(id, t);

      const style = skyStyle(phase, scrollState.progress);
      layer.style.backgroundImage = style.backgroundImage as string;
      layer.style.backgroundPosition = style.backgroundPosition as string;

      if (glow) {
        glow.style.background = `radial-gradient(46% 20% at 50% 98%, ${phase.glow} 0%, transparent 72%)`;
        glow.style.opacity = String(phase.glowStrength);
      }
    };

    // Reduced motion still gets the dusk-to-dawn arc, but driven by plain
    // scroll events instead of the ticker, so nothing animates on its own.
    if (prefersReducedMotion()) {
      paint();
      window.addEventListener('scroll', paint, { passive: true });
      return () => window.removeEventListener('scroll', paint);
    }

    // A very slow drift on top of the scroll link, so the sky is never a still
    // image. 0.4% amplitude: enough to be alive, not enough to notice moving.
    const drift = { value: 0 };
    const tick = () => {
      paint();
      drift.value = (drift.value + 0.00035) % 1;
    };

    gsap.ticker.add(tick);
    paint();

    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div ref={layerRef} className="absolute inset-0" />
      {/* A soft warm bloom near the horizon, separate so its opacity can move
          independently of the gradient stops. */}
      <div ref={glowRef} className="absolute inset-0 mix-blend-screen" />
    </div>
  );
}