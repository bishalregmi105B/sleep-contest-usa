'use client';

import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Suspense, useCallback, useState } from 'react';
import { SETTINGS, downgrade, type Tier } from '@/lib/quality';
import { scrollState } from '@/lib/scroll-state';
import { Atmosphere } from './Atmosphere';

/**
 * The one and only WebGL context on the page.
 *
 * Fixed and full-screen behind the DOM, with `pointer-events: none` so it never
 * intercepts a click. Every section reads from `scrollState`; no section
 * creates a context of its own.
 *
 * The scene now draws **only atmosphere**: stars, a faceless moon, dust motes
 * and light shafts. The toy objects are gone rather than restyled, because
 * restyling them would still read as toys.
 *
 * On a sustained frame-rate decline the tier steps down one level, once. The
 * downgrade is one-way so quality cannot oscillate.
 */
export function SceneRoot({ tier: initialTier }: { readonly tier: Tier }) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [contextLost, setContextLost] = useState(false);

  const settings = SETTINGS[tier === 'none' ? 'low' : tier];

  const onDecline = useCallback(() => {
    setTier((current) => {
      if (current === 'low' || current === 'none') return current;
      const next = downgrade(current);
      scrollState.tier = next;
      document.documentElement.dataset.tier = next;
      return next;
    });
  }, []);

  if (contextLost) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      ref={(node) => {
        // The canvas element is created by R3F after mount, so listen for the
        // context-lost event on the container via capture.
        if (!node || node.dataset.wired === 'true') return;
        node.dataset.wired = 'true';
        node.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            setContextLost(true);
          },
          true,
        );
      }}
    >
      <Canvas
        dpr={[1, settings.dprMax]}
        frameloop={scrollState.active ? 'always' : 'never'}
        camera={{ fov: 40, near: 0.1, far: 100, position: [0, 0, 6] }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: true,
          stencil: false,
          depth: false,
        }}
        onCreated={({ gl }) => {
          // One tone-mapping stage, set once on the renderer. No
          // EffectComposer and no extra Noise pass: the CSS film grain does the
          // grain, and a second grade would desaturate the palette.
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = SRGBColorSpace;
        }}
        onError={() => setContextLost(true)}
        style={{ position: 'fixed', inset: 0 }}
      >
        <PerformanceMonitor onDecline={onDecline} flipflops={2} bounds={() => [45, 60]}>
          <Suspense fallback={null}>
            <Atmosphere tier={tier} />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}