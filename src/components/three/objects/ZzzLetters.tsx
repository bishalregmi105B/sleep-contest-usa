'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ExtrudeGeometry, Shape, type Group, type Mesh } from 'three';
import { presence } from '@/lib/scroll-state';

/**
 * Inflatable Zzz letters.
 *
 * Three extruded, bevelled Z shapes that rise along a curve, drift slightly and
 * fade in a loop. Each letter has its own phase so they never rise in lockstep.
 *
 * The geometry is built once; `useFrame` only mutates transforms and opacity.
 */
const COUNT = 3;
const LOOP = 6;

function makeZ(): ExtrudeGeometry {
  const shape = new Shape();
  // A blocky Z traced clockwise: top bar, diagonal, bottom bar, then back up
  // the left edge to close. Eight points, because a Z has two notches.
  const w = 0.5;
  const h = 0.62;
  const t = 0.16;

  shape.moveTo(-w, h);
  shape.lineTo(w, h);
  shape.lineTo(w, h - t);
  shape.lineTo(-w + t, -h + t);
  shape.lineTo(w, -h + t);
  shape.lineTo(w, -h);
  shape.lineTo(-w, -h);
  shape.lineTo(-w, h - t);
  shape.closePath();

  return new ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 3,
    curveSegments: 2,
  });
}

export function ZzzLetters() {
  const groupRef = useRef<Group>(null);
  const meshes = useRef<Array<Mesh | null>>([]);

  // One geometry shared by all three letters.
  const geometry = useMemo(() => makeZ(), []);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // A hero beat: the letters rise over the poster, then are gone.
    const amount = presence('hero');
    group.visible = amount > 0;
    if (!group.visible) return;

    for (let i = 0; i < COUNT; i += 1) {
      const mesh = meshes.current[i];
      if (!mesh) continue;

      // Stagger each letter so they rise one after another.
      const phase = (clock.elapsedTime / LOOP + i / COUNT) % 1;
      const rise = phase;

      mesh.position.y = -0.2 + rise * 3.2;
      // Drift right as they climb, on a gentle S-curve.
      mesh.position.x = -0.1 + Math.sin(rise * Math.PI) * 0.5 + i * 0.28;
      mesh.position.z = -0.4 + i * 0.25;
      mesh.rotation.y += delta * (0.6 + i * 0.2);
      mesh.rotation.z = Math.sin(rise * Math.PI * 2) * 0.12;

      // Fade in at the bottom, out at the top.
      const material = mesh.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = Math.sin(rise * Math.PI) * 0.95 * amount;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            meshes.current[i] = node;
          }}
          geometry={geometry}
          scale={0.8 - i * 0.14}
        >
          <meshPhysicalMaterial
            color="#FFE14A"
            clearcoat={0.8}
            clearcoatRoughness={0.2}
            roughness={0.28}
            metalness={0}
            emissive="#FFE14A"
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
    </group>
  );
}