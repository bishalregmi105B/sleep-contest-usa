'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { SCENE_STATES, SECTION_ORDER, scrollState } from '@/lib/scroll-state';

/**
 * Camera rig.
 *
 * Interpolates continuously between the scene states of the section above and
 * the section below the viewport centre, rather than jumping to whichever
 * section happens to be "active". Discrete per-section targets made the scene
 * look like it teleported between unrelated objects; blending the two nearest
 * states by scroll position makes it read as one continuous dolly through a
 * single night.
 *
 * Scratch vectors live in refs: they are mutated every frame and must never be
 * allocated inside the frame loop.
 */
export function CameraRig() {
  const { camera } = useThree();

  const lookTarget = useRef(new Vector3(0.4, 0.2, 0));
  const cameraPos = useRef(new Vector3(0.8, 0.5, 7.5));
  const lookAt = useRef(new Vector3(0, 0, 0));

  useFrame((_, delta) => {
    // Which two states are we between, and how far?
    const { from, to, mix } = neighbours();

    const a = SCENE_STATES[from]!;
    const b = SCENE_STATES[to]!;

    // Camera and look-at are interpolated in their own space.
    cameraPos.current.set(
      MathUtils.lerp(a.camera[0], b.camera[0], mix),
      MathUtils.lerp(a.camera[1], b.camera[1], mix),
      MathUtils.lerp(a.camera[2], b.camera[2], mix),
    );
    lookAt.current.set(
      MathUtils.lerp(a.lookAt[0], b.lookAt[0], mix),
      MathUtils.lerp(a.lookAt[1], b.lookAt[1], mix),
      MathUtils.lerp(a.lookAt[2], b.lookAt[2], mix),
    );

    // The How-it-works rail dollies horizontally on top of its state.
    if (a.id === 'how' || b.id === 'how') {
      const rail = MathUtils.lerp(-2.5, 2.5, scrollState.section.t);
      cameraPos.current.x += rail;
      lookAt.current.x += rail;
    }

    // Pointer parallax, damped, only on capable tiers.
    const parallax = scrollState.tier === 'low' ? 0 : 0.28;
    cameraPos.current.x += scrollState.pointer.x * parallax;
    cameraPos.current.y += -scrollState.pointer.y * parallax * 0.6;

    // A short damp removes scroll jitter without introducing visible lag.
    const lambda = 1 - Math.pow(0.0000005, delta);

    const cam = camera as PerspectiveCamera;
    cam.position.lerp(cameraPos.current, lambda);
    lookTarget.current.lerp(lookAt.current, lambda);
    cam.lookAt(lookTarget.current);
  });

  return null;
}

/**
 * Resolves the two scene states the viewport is between and the blend factor.
 *
 * Section progress is 0 at a section's entry and 1 at its exit, so a mix of 0.5
 * is exactly halfway between the two neighbours. Clamped, because a value
 * outside 0..1 would push the camera past the states it is blending.
 */
function neighbours(): { from: string; to: string; mix: number } {
  const current = scrollState.section.id;
  const index = SECTION_ORDER.indexOf(
    current as (typeof SECTION_ORDER)[number],
  );

  if (index < 0) {
    return { from: SECTION_ORDER[0], to: SECTION_ORDER[0], mix: 0 };
  }

  const from = SECTION_ORDER[index]!;
  const to = SECTION_ORDER[Math.min(index + 1, SECTION_ORDER.length - 1)]!;

  return { from, to, mix: MathUtils.clamp(scrollState.section.t, 0, 1) };
}