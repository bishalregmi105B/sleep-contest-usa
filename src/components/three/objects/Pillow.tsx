'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, type Group, type MeshPhysicalMaterial } from 'three';
import { scrollState } from '@/lib/scroll-state';

/**
 * The giant pillow.
 *
 * A rounded box with a soft physical material (sheen for the fabric, low
 * clearcoat), breathing on a 4 second loop. It slides left and shrinks as the
 * counter section takes over, then recedes with the sleeper so the sections
 * below carry only copy.
 */
export function Pillow() {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<MeshPhysicalMaterial>(null);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Breathing, 4 second cycle.
    const breath = 1 + Math.sin((clock.elapsedTime * Math.PI * 2) / 4) * 0.03;

    const depth = sectionDepth();
    // Hero and counter stay close; past that the pillow recedes with the sleeper.
    const recede = MathUtils.clamp(depth, 0, 1);
    const targetScale = MathUtils.lerp(1, 0.5, recede);

    const lambda = 1 - Math.pow(0.0015, delta);
    const next = MathUtils.lerp(group.scale.x, breath * targetScale, lambda);

    group.scale.setScalar(next);
    // Settle into the resting pose without snapping.
    group.position.x = MathUtils.lerp(group.position.x, -1.6 - recede * 1.5, lambda);
    group.position.y = MathUtils.lerp(group.position.y, -0.15 - recede * 0.4, lambda);
    group.position.z = MathUtils.lerp(group.position.z, -recede * 14, lambda);
    group.rotation.z = MathUtils.lerp(group.rotation.z, -0.06, lambda);

    const material = materialRef.current;
    if (material) {
      material.transparent = true;
      material.opacity = 1 - recede;
    }
  });

  return (
    <group ref={groupRef} position={[-1.6, -0.15, 0.2]} rotation={[0, 0, -0.06]}>
      <RoundedBox args={[2.6, 0.85, 1.5]} radius={0.32} smoothness={6}>
        <meshPhysicalMaterial
          ref={materialRef}
          color="#FFF8E7"
          roughness={0.6}
          sheen={0.8}
          sheenColor="#D9D2FF"
          sheenRoughness={0.5}
          clearcoat={0.15}
        />
      </RoundedBox>
    </group>
  );
}

/** Index of the current section in page order. */
function sectionDepth(): number {
  const order = [
    'hero',
    'counter',
    'how',
    'squad',
    'prizes',
    'gallery',
    'reserve',
    'faq',
    'cta',
  ] as const;
  const index = order.indexOf(scrollState.section.id as (typeof order)[number]);
  return index < 0 ? 0 : index;
}