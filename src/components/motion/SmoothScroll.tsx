'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, registerGsap, ScrollTrigger } from '@/lib/gsap';

/**
 * Smooth scrolling.
 *
 * Lenis runs with `autoRaf: false` and is driven from GSAP's ticker, so both
 * libraries share one RAF loop and one clock. Lenis moves the native window,
 * which means ScrollTrigger needs no scroller proxy.
 *
 * Disabled entirely for reduced motion; anchor links then use native scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    registerGsap();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.05,
      // Gentle easing: smooths wheel jitter without feeling laggy.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    // One RAF loop for Lenis, GSAP and ScrollTrigger.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    // Anchor links inherit the same easing instead of jumping.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const element = document.querySelector<HTMLElement>(href);
      if (!element) return;

      event.preventDefault();
      lenis.scrollTo(element, { offset: -80 });
    };

    document.addEventListener('click', onClick);

    // ScrollTrigger must re-measure once fonts and the hero image settle.
    const refresh = () => ScrollTrigger.refresh();
    void document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('load', refresh);
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.refresh();
    };
  }, []);

  return null;
}