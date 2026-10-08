'use client';

import { useEffect } from 'react';
import { registerGsap, ScrollTrigger } from '@/lib/gsap';
import { scrollState, SECTION_ORDER } from '@/lib/scroll-state';

/**
 * Feeds scroll state to the 3D scene.
 *
 * Writes into a plain mutable object rather than React state, because these
 * values change every frame. The scene reads them inside `useFrame`.
 *
 * The active section is derived from the viewport centre rather than from
 * per-section trigger progress. Per-trigger progress is ambiguous for
 * full-height sections — a section scrolled to the top of the viewport sits
 * exactly at 0.5 — so two adjacent triggers both claim the state and the wrong
 * one wins depending on call order.
 */
export function ScrollBinder() {
  useEffect(() => {
    registerGsap();

    let lastY = window.scrollY;

    /** Which section the viewport centre currently sits inside. */
    const resolveSection = (): string => {
      const centre = window.scrollY + window.innerHeight / 2;

      let active: string = SECTION_ORDER[0];
      for (const id of SECTION_ORDER) {
        const element = document.getElementById(id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const bottom = top + rect.height;

        // The last section whose top we have passed is the active one.
        if (centre >= top) active = id;
        if (centre <= bottom) break;
      }

      return active;
    };

    /** How far through the active section we are, 0 to 1. */
    const resolveProgress = (id: string): number => {
      const element = document.getElementById(id);
      if (!element) return 0;

      const rect = element.getBoundingClientRect();
      return Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    };

    const publish = () => {
      const id = resolveSection();
      scrollState.section.id = id;
      scrollState.section.t = resolveProgress(id);
      // Mirrored onto <html> so tests can assert the active scene state, and so
      // it is inspectable in the browser without a debugger.
      document.documentElement.dataset.section = id;
    };

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollState.progress = self.progress;
        const y = self.scroll();
        scrollState.velocity = y - lastY;
        lastY = y;
        publish();
      },
    });

    const onPointer = (event: PointerEvent) => {
      scrollState.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onVisibility = () => {
      scrollState.active = document.visibilityState === 'visible';
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    publish();

    // Fonts and images change layout heights; re-measure once they land.
    void document.fonts?.ready.then(() => {
      ScrollTrigger.refresh();
      publish();
    });

    return () => {
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      trigger.kill();
      delete document.documentElement.dataset.section;
    };
  }, []);

  return null;
}