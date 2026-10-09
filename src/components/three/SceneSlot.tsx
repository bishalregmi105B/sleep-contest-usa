'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { detectTier } from '@/lib/quality';
import { scrollState } from '@/lib/scroll-state';
import type { Tier } from '@/lib/quality';

/**
 * Mount point for the single persistent canvas.
 *
 * The canvas is loaded with `ssr: false` and only after first paint and an
 * idle callback, so the WebGL chunk never sits in the critical path. When the
 * tier is `none` (no WebGL2, or reduced motion) no context is created at all
 * and the cinematic CSS sky carries the page on its own.
 */
const SceneRoot = dynamic(
  () => import('./SceneRoot').then((m) => m.SceneRoot),
  { ssr: false },
);

export function SceneSlot() {
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<Tier>('none');

  useEffect(() => {
    const detected = detectTier();
    scrollState.tier = detected;
    document.documentElement.dataset.tier = detected;

    // Reduced motion and no-WebGL both land here. The sky, grain and vignette
    // are already painted, so there is nothing to fall back to.
    if (detected === 'none') return;

    const schedule = () => {
      setTier(detected);
      setReady(true);
      document.documentElement.dataset.scene = 'webgl';
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(schedule, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }

    const id = setTimeout(schedule, 300);
    return () => clearTimeout(id);
  }, []);

  // Nothing to mount: the CSS cinematic stage is the whole background.
  if (tier === 'none') return null;

  return ready ? <SceneRoot tier={tier} /> : null;
}