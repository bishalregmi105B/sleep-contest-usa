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
 * idle callback, so the 3D chunk never sits in the critical path. When the
 * tier is `none` (no WebGL2, or reduced motion) the static night renders
 * instead and no WebGL context is created at all.
 */
const SceneRoot = dynamic(
  () => import('./SceneRoot').then((m) => m.SceneRoot),
  { ssr: false },
);

/**
 * Layered night built from the hero poster and CSS gradients. Used when WebGL
 * is unavailable or the visitor prefers reduced motion, and when the context is
 * lost mid-session.
 */
function StaticNight() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-0"
      style={{
        background:
          'linear-gradient(to top, var(--sky-bottom) 0%, var(--sky-mid) 45%, var(--sky-top) 100%)',
      }}
    />
  );
}

export function SceneSlot() {
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<Tier>('none');

  useEffect(() => {
    const detected = detectTier();
    scrollState.tier = detected;

    if (detected === 'none') return;

    // Wait for first paint, then for an idle slot, before creating a WebGL
    // context. The static night covers the page in the meantime.
    const schedule = () => {
      setTier(detected);
      setReady(true);
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(schedule, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }

    const id = setTimeout(schedule, 300);
    return () => clearTimeout(id);
  }, []);

  if (tier === 'none') return <StaticNight />;

  return (
    <>
      {/* Always present behind the canvas so there is never a flash of flat
          colour before the scene resolves its tier. */}
      <StaticNight />
      {ready ? <SceneRoot tier={tier} /> : null}
    </>
  );
}