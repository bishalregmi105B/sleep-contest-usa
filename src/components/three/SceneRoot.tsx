'use client';

import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { NoToneMapping, SRGBColorSpace } from 'three';
import { Suspense, useCallback, useState } from 'react';
import { SETTINGS, downgrade, type Tier } from '@/lib/quality';
import { scrollState } from '@/lib/scroll-state';
import { CameraRig } from './rig/CameraRig';
import { SceneLights } from './rig/SceneLights';
import { SkyDome } from './rig/SkyDome';
import { Stars } from './objects/Stars';
import { Moon } from './objects/Moon';
import { Pillow } from './objects/Pillow';
import { Sleeper } from './objects/Sleeper';
import { ZzzLetters } from './objects/ZzzLetters';
import { SceneObjects } from './objects/SceneObjects';

/**
 * The one and only WebGL context on the page.
 *
 * Fixed and full-screen behind the DOM, with `pointer-events: none` so it never
 * intercepts a click. Every section reads from this scene through
 * `scrollState`; no section creates a context of its own.
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
        camera={{ fov: 40, near: 0.1, far: 100, position: [0.8, 0.5, 7.5] }}
        gl={{
          antialias: tier !== 'low',
          powerPreference: 'high-performance',
          alpha: true,
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          // The palette is the design. ACES desaturates the dusk pink and the
          // Zzz yellow towards brown, which stops the 3D matching the Stitch
          // PNGs, so output is left untransformed.
          gl.toneMapping = NoToneMapping;
          gl.outputColorSpace = SRGBColorSpace;
        }}
        onError={() => setContextLost(true)}
        style={{ position: 'fixed', inset: 0 }}
      >
        <PerformanceMonitor
          onDecline={onDecline}
          flipflops={2}
          bounds={() => [45, 60]}
        >
          <Suspense fallback={null}>
            <SceneLights />
            <SkyDome />
            <Stars count={settings.stars} />
            <CameraRig />
            <Moon />
            <Pillow />
            <Sleeper />
            <ZzzLetters />
            <SceneObjects tier={tier} />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}