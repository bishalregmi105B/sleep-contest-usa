'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { sceneStateFor, scrollState } from '@/lib/scroll-state';

/**
 * Camera rig.
 *
 * Damps the camera toward the current section's position and look-at target,
 * so scrolling between sections glides rather than snaps. Adds a small damped
 * pointer parallax and a dolly across the How-it-works beat.
 *
 * Scratch vectors live in refs: they are mutated every frame and must never be
 * allocated inside the frame loop.
 */
export function CameraRig() {
  const { camera } = useThree();
  const lookTarget = useRef(new Vector3(0.4, 0.2, 0));
  const desiredPosition = useRef(new Vector3(0.8, 0.5, 7.5));
  const desiredLook = useRef(new Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const state = sceneStateFor(scrollState.section.id);
    const t = scrollState.section;

    // How-it-works dollies across four beats as the rail scrolls.
    const railOffset = state.id === 'how' ? MathUtils.lerp(-2.5, 2.5, t.t) : 0;

    desiredPosition.current.set(
      state.camera[0] + railOffset,
      state.camera[1],
      state.camera[2],
    );
    desiredLook.current.set(state.lookAt[0] + railOffset, state.lookAt[1], state.lookAt[2]);

    // Pointer parallax, only for fine pointers and never in reduced motion.
    const parallax = scrollState.tier === 'low' ? 0 : 0.28;
    desiredPosition.current.x += scrollState.pointer.x * parallax;
    desiredPosition.current.y += -scrollState.pointer.y * parallax * 0.6;

    // Frame-rate independent damping.
    const lambda = 1 - Math.pow(0.0015, delta);

    const cam = camera as PerspectiveCamera;
    cam.position.lerp(desiredPosition.current, lambda);
    lookTarget.current.lerp(desiredLook.current, lambda);
    cam.lookAt(lookTarget.current);
  });

  return null;
}