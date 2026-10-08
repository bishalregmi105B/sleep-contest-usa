'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/**
 * GSAP setup, registered exactly once.
 *
 * ScrollTrigger drives from the native window because Lenis moves the window
 * rather than a transformed wrapper, so no `scrollerProxy` is needed.
 */
let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger, useGSAP);

  // Lag smoothing hides real frame drops by stretching time; we would rather
  // see them, especially on the low tier.
  gsap.ticker.lagSmoothing(0);

  registered = true;
}

export { gsap, ScrollTrigger, useGSAP };