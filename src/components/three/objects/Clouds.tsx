'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BufferGeometry,
  SphereGeometry,
  Matrix4,
  type Group,
  type Mesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { presence } from '@/lib/scroll-state';
import { seedFrom, seededRandom } from '@/lib/random';
import { SETTINGS, type Tier } from '@/lib/quality';

/**
 * Drifting clouds.
 *
 * Overlapping spheres left visible intersection seams, because each sphere kept
 * its own normals and the join read as a crease. Merging every puff into one
 * geometry and recomputing the vertex normals afterwards removes the seams and
 * lets the lumps shade as a single soft mass.
 *
 * Count comes from the quality tier; the low tier gets none.
 */
export function Clouds({ tier }: { readonly tier: Tier }) {
  const count = SETTINGS[tier === 'none' ? 'low' : tier].clouds;

  const groupRef = useRef<Group>(null);
  const meshes = useRef<Array<Mesh | null>>([]);

  const geometries = useMemo(() => {
    const random = seededRandom(seedFrom('clouds'));

    return Array.from({ length: count }, () => {
      const puffCount = 7 + Math.floor(random() * 4);
      const parts: BufferGeometry[] = [];

      for (let i = 0; i < puffCount; i += 1) {
        const puff = new SphereGeometry(0.45 + random() * random() * 1.15, 22, 16);

        // Jitter each puff outward so the silhouette is irregular, which is
        // what stops it reading as a stack of spheres.
        const position = puff.attributes.position as {
          count: number;
          getX: (i: number) => number;
          getY: (i: number) => number;
          getZ: (i: number) => number;
          setXYZ: (i: number, x: number, y: number, z: number) => void;
        };
        for (let v = 0; v < position.count; v += 1) {
          const jitter = 0.97 + random() * 0.06;
          position.setXYZ(
            v,
            position.getX(v) * jitter,
            position.getY(v) * jitter,
            position.getZ(v) * jitter,
          );
        }

        // Overlapping placement with vertical scatter, so the puffs merge into
        // one mass instead of trailing off in a line.
        puff.applyMatrix4(
          new Matrix4().makeTranslation(
            (i - puffCount / 2) * 0.36 + (random() - 0.5) * 0.3,
            (random() - 0.35) * 0.55,
            (random() - 0.5) * 0.7,
          ),
        );

        parts.push(puff);
      }

      const merged = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();

      if (merged) {
        // Recomputing normals across the merge is what hides the seams: the
        // cloud now shades as one continuous surface.
        merged.computeVertexNormals();
      }

      return merged;
    });
  }, [count]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group || count === 0) return;

    const amount = presence('hero', 'counter');
    group.visible = amount > 0;
    if (!group.visible) return;

    const t = clock.elapsedTime;

    for (let i = 0; i < count; i += 1) {
      const mesh = meshes.current[i];
      if (!mesh) continue;

      // Slow lateral drift that wraps, so the sky always has some motion.
      mesh.position.x = ((t * (0.05 + i * 0.015) + i * 7.3) % 26) - 13;
      // A gentle bob, out of step per cloud.
      mesh.position.y = 1.9 + Math.sin(t * 0.22 + i * 1.7) * 0.3 + i * 0.75;

      const material = mesh.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = 0.72 * amount;
    }
  });

  if (count === 0) return null;

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) =>
        geometry ? (
          <mesh
            key={i}
            ref={(node) => {
              meshes.current[i] = node;
            }}
            geometry={geometry}
            position={[-13 + i * 7, 1.9 + i * 0.75, -12 - i * 2]}
          >
            <meshPhysicalMaterial
              color="#DCD4FA"
              roughness={1}
              metalness={0}
              specularIntensity={0.1}
              // A little self-light so clouds stay soft and bright instead of
              // going dark against the sky.
              emissive="#8C7FD0"
              emissiveIntensity={0.22}
            />
          </mesh>
        ) : null,
      )}
    </group>
  );
}
