'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type DirectionalLight, type HemisphereLight } from 'three';
import { sceneStateFor, scrollState } from '@/lib/scroll-state';

/**
 * Scene lighting.
 *
 * Everything in the scene uses a standard or physical material, so without
 * lights the whole scene renders black. Three sources:
 *
 *  - a hemisphere light for ambient sky/ground bounce, tinted from the current
 *    sky so the light follows the time of night,
 *  - a key light standing in for the moon,
 *  - a warm fill from below for the dawn and squad sections.
 *
 * Colours are damped rather than snapped, so the light shifts with the sky.
 */
export function SceneLights() {
  const hemiRef = useRef<HemisphereLight>(null);
  const keyRef = useRef<DirectionalLight>(null);
  const fillRef = useRef<DirectionalLight>(null);

  const skyColor = useRef(new Color('#3A2C78'));
  const groundColor = useRef(new Color('#FF9A3C'));
  const keyColor = useRef(new Color('#FFF8E7'));
  const target = useRef({
    sky: new Color('#3A2C78'),
    ground: new Color('#FF9A3C'),
    key: new Color('#FFF8E7'),
  });

  useFrame((_, delta) => {
    const state = sceneStateFor(scrollState.section.id);
    const lambda = 1 - Math.pow(0.002, delta);

    // The light takes its colours from the sky it sits under.
    target.current.sky.set(state.sky[2]);
    target.current.ground.set(state.sky[0]);
    // The moon is always warm white; dawn pushes it towards orange.
    target.current.key.set(state.id === 'cta' ? '#FFD9A0' : '#FFF8E7');

    skyColor.current.lerp(target.current.sky, lambda);
    groundColor.current.lerp(target.current.ground, lambda);
    keyColor.current.lerp(target.current.key, lambda);

    const hemi = hemiRef.current;
    if (hemi) {
      hemi.color.copy(skyColor.current);
      hemi.groundColor.copy(groundColor.current);
    }

    const key = keyRef.current;
    if (key) key.color.copy(keyColor.current);

    const fill = fillRef.current;
    if (fill) {
      fill.color.copy(groundColor.current);
      fill.intensity = state.id === 'cta' || state.id === 'squad' ? 1.4 : 0.9;
    }
  });

  return (
    <>
      {/* Ambient bounce: sky above, warm ground below. */}
      <hemisphereLight ref={hemiRef} args={['#8A7BD4', '#FFB87A', 2.2]} />

      {/* Key light, standing in for the moon at upper right. */}
      <directionalLight ref={keyRef} position={[4, 5, 3]} intensity={2.6} />

      {/* Warm fill from below front, stronger at dawn. */}
      <directionalLight ref={fillRef} position={[-2, -3, 4]} intensity={0.45} />

      {/* Keeps the sleeper and pillow reading as the subject in the hero. */}
      <pointLight position={[0.4, 1.2, 3]} intensity={6} distance={9} decay={2} />
    </>
  );
}