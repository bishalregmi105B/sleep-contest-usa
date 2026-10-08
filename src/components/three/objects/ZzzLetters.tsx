'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ExtrudeGeometry, MathUtils, Shape, type Group, type Mesh } from 'three';
import { presence } from '@/lib/scroll-state';

/**
 * The Zzz letters: the strongest sleep signifier there is.
 *
 * A horizontal sleeping figure reads as "relaxed"; the letters are what make it
 * read as "asleep". They are the hero of the scene, so they are sized and placed
 * to be unmistakably the subject rather than background decoration:
 *
 *  - three letters of decreasing size, the classic form,
 *  - each overlapping the next slightly and tilted right, as they always are,
 *  - rising along a curve with a slow fade, never faster than about 0.5 Hz.
 *    Fast motion provokes alertness, which is the opposite of the point.
 *
 * The geometry is built once; the frame loop only mutates transforms.
 */

/** One blocky Z, traced clockwise: top bar, diagonal, bottom bar. */
function makeZ(): ExtrudeGeometry {
  const shape = new Shape();

  const w = 0.62;
  const h = 0.76;
  const t = 0.2;

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
    depth: 0.22,
    // A generous bevel is what makes these read as inflated rather than cut.
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 2,
  });
}

const LOOP = 7.5;

export function ZzzLetters() {
  const groupRef = useRef<Group>(null);
  const meshes = useRef<Array<Mesh | null>>([]);

  const geometry = useMemo(() => makeZ(), []);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    // A hero beat: the letters rise over the sleeper, then are gone.
    const amount = presence('hero');
    group.visible = amount > 0;
    if (!group.visible) return;

    for (let i = 0; i < 3; i += 1) {
      const mesh = meshes.current[i];
      if (!mesh) continue;

      // Staggered so the letters rise one after another, never in lockstep.
      const phase = (clock.elapsedTime / LOOP + i / 3) % 1;

      // Climb to the upper right, where sleep is conventionally drawn.
      mesh.position.y = 0.2 + phase * 3.2;
      mesh.position.x = -0.4 + Math.sin(phase * Math.PI) * 0.34 + i * 0.28;
      mesh.position.z = -3.2 + i * 0.28;

      // The classic rightward tilt, held through the whole rise.
      mesh.rotation.z = -0.22;
      // Slow tumble so they catch the light as they turn.
      mesh.rotation.y = clock.elapsedTime * 0.35 + i * 0.5;
      mesh.rotation.x = Math.sin(phase * Math.PI * 2) * 0.1;

      const material = mesh.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      // Fade in low, fade out high, and never pop at either end.
      const fade =
        MathUtils.smoothstep(phase, 0, 0.18) * (1 - MathUtils.smoothstep(phase, 0.6, 1));
      material.opacity = fade * amount;
    }
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            meshes.current[i] = node;
          }}
          geometry={geometry}
          // Each letter a little smaller than the one before it.
          scale={0.7 - i * 0.12}
        >
          <meshPhysicalMaterial
            color="#FFE14A"
            // Clay rather than plastic: matte, barely any specular. A little
            // clearcoat keeps them feeling inflated without going glossy.
            roughness={0.62}
            metalness={0}
            specularIntensity={0.35}
            clearcoat={0.25}
            clearcoatRoughness={0.5}
            emissive="#FFE14A"
            emissiveIntensity={0.28}
          />
        </mesh>
      ))}
    </group>
  );
}
