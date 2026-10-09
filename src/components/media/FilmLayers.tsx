'use client';

import { useEffect } from 'react';
import { detectTier } from '@/lib/quality';

/**
 * Film grain and vignette.
 *
 * These two layers do most of the work of making a dark page read as film
 * rather than as a flat dark rectangle. They are fixed overlays above
 * everything, both purely decorative.
 *
 * The grain is disabled on the `low` and `none` tiers and under reduced motion:
 * a full-screen blended overlay is the most expensive thing on the page, and on
 * a device that cannot afford it the tone is more valuable than the texture.
 */
export function FilmLayers() {
  useEffect(() => {
    const tier = detectTier();
    document.documentElement.dataset.tier = tier;

    if (tier !== 'low' && tier !== 'none') return;

    // The CSS hides .film-grain for these tiers; this makes the state
    // inspectable from the DOM and from tests.
    document.documentElement.dataset.grain = tier === 'low' ? 'off' : 'none';
  }, []);

  return (
    <>
      <div className="film-grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </>
  );
}