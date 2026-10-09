'use client';

import { SITE } from '@/content/site';

/**
 * "Lights down".
 *
 * A black screen with the wordmark fading in and out, then the hero. Replaces
 * the sheep-counter preloader.
 *
 * Deliberately not React state: the whole thing is one CSS animation that ends
 * on `visibility: hidden`, so it costs no re-render and never blocks LCP. A
 * tiny inline script in the document head sets `data-preloader="done"` before
 * first paint when this session has already seen it, which means a returning
 * visitor never sees a flash of black.
 *
 * Under reduced motion the CSS never runs the animation at all, so the
 * overlay is simply not shown.
 */
export function Preloader() {
  return (
    <div aria-hidden="true" className="lights-down fixed inset-0 z-[70] grid place-items-center bg-ink">
      <span className="font-display text-lg font-bold uppercase tracking-[0.28em] text-paper/70">
        {SITE.name}
      </span>
    </div>
  );
}