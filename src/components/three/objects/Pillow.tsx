'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, type Group, type MeshPhysicalMaterial } from 'three';
import { presence } from '@/lib/scroll-state';

/**
 * The giant pillow.
 *
 * The bevel radius is the whole trick: at roughly a third of its height it
 * reads as a soft, inflatable cushion, where a tight radius reads as a box.
 * A fabric sheen on top of a matte base gives it cloth rather than plastic.
 *
 * It breathes on a 4 second cycle, then leaves the frame after the hero.
 */
export function Pillow() {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<MeshPhysicalMaterial>(null);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const amount = presence('hero');
    group.visible = amount > 0;
    if (!group.visible) return;

    const breath = 1 + Math.sin((clock.elapsedTime * Math.PI * 2) / 4) * 0.035;
    const recede = 1 - amount;
    const lambda = 1 - Math.pow(0.0015, delta);

    group.scale.setScalar(MathUtils.lerp(group.scale.x, breath * MathUtils.lerp(1, 0.6, recede), lambda));
    group.position.x = MathUtils.lerp(group.position.x, -1.9 - recede * 2.2, lambda);
    group.position.y = MathUtils.lerp(group.position.y, -0.34 - recede * 0.3, lambda);
    group.position.z = MathUtils.lerp(group.position.z, -recede * 10, lambda);
    group.rotation.z = MathUtils.lerp(group.rotation.z, -0.09, lambda);

    const material = materialRef.current;
    if (material) {
      material.transparent = true;
      material.opacity = amount;
    }
  });

  return (
    <group ref={groupRef} position={[-1.9, -0.34, 0.3]} rotation={[0, 0, -0.09]}>
      <RoundedBox args={[2.9, 0.95, 1.7]} radius={0.32} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={materialRef}
          color="#FFF8E7"
          roughness={0.9}
          metalness={0}
          specularIntensity={0.18}
          // Sheen is for cloth, so the pillow gets it and the moon does not.
          sheen={0.8}
          sheenRoughness={0.7}
          sheenColor="#D9D2FF"
        />
      </RoundedBox>
    </group>
  );
}
