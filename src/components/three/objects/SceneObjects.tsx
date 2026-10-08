'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  CylinderGeometry,
  Euler,
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
} from 'three';
import { SETTINGS, type Tier } from '@/lib/quality';
import { presence } from '@/lib/scroll-state';
import { seedFrom, seededRandom } from '@/lib/random';

/** Scratch objects for the coin transforms, allocated once. */
const scratch = new Matrix4();
const scratchPosition = new Vector3();
const scratchScale = new Vector3(1, 1, 1);
const scratchQuaternion = new Quaternion();
const scratchEuler = new Euler();

/**
 * The rest of the scene: squad props, coins and the sunrise.
 *
 * Each group fades in only while its own section is on screen, so the scene
 * never carries more than a couple of objects at once. Counts come from the
 * quality tier; everything degrades to nothing on the low tier rather than
 * costing a draw call.
 */
export function SceneObjects({ tier }: { readonly tier: Tier }) {
  const settings = SETTINGS[tier === 'none' ? 'low' : tier];

  return (
    <>
      <SquadProps />
      {settings.coins > 0 ? <Coins count={settings.coins} /> : null}
      <Sunrise />
      <AlarmClock />
    </>
  );
}

/** Air horn, feather and bacon that appear around the sleeper for #squad. */
function SquadProps() {
  const groupRef = useRef<Group>(null);
  const hornRef = useRef<Mesh>(null);
  const featherRef = useRef<Group>(null);
  const baconRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const active = presence('squad') > 0;
    group.visible = active;
    if (!active) return;

    const t = clock.elapsedTime;

    if (hornRef.current) hornRef.current.position.x = Math.sin(t * 6) * 0.06;
    if (featherRef.current) {
      featherRef.current.position.y = 0.3 + Math.sin(t * 2.4) * 0.12;
      featherRef.current.rotation.z = Math.sin(t * 2.4) * 0.2;
    }
    if (baconRef.current) baconRef.current.position.y = Math.sin(t * 1.6) * 0.05;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Air horn */}
      <mesh ref={hornRef} position={[-1.9, 0.5, 0.4]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.22, 0.9, 16]} />
        <meshStandardMaterial color="#FFE14A" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Feather: a thin curved plane */}
      <group ref={featherRef} position={[1.6, 0.3, 0.3]}>
        <mesh rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.05, 0.7, 4, 8]} />
          <meshStandardMaterial color="#FF4F8B" roughness={0.85} />
        </mesh>
      </group>

      {/* Bacon: a wavy strip */}
      <group ref={baconRef} position={[0.2, 0.75, -0.6]}>
        <mesh rotation={[0.3, 0, 0.2]}>
          <boxGeometry args={[0.9, 0.12, 0.3]} />
          <meshStandardMaterial color="#B8482E" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/** Instanced coins that drift up through the prizes section. */
function Coins({ count }: { readonly count: number }) {
  const meshRef = useRef<InstancedMesh>(null);

  const geometry = useMemo(() => new CylinderGeometry(0.16, 0.16, 0.04, 16), []);
  const offsets = useMemo(() => {
    const random = seededRandom(seedFrom('coins'));
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 6,
      z: (random() - 0.5) * 3 - 1,
      phase: random(),
      speed: 0.25 + random() * 0.35,
      spin: random() * Math.PI,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const active = presence('prizes') > 0;
    mesh.visible = active;
    if (!active) return;

    const t = clock.elapsedTime;

    for (let i = 0; i < count; i += 1) {
      const offset = offsets[i]!;
      const rise = ((offset.phase + t * offset.speed) % 1) * 5 - 1.5;

      scratchPosition.set(offset.x, rise, offset.z);
      scratchEuler.set(t * 1.6 + offset.spin, t * 1.6 + offset.spin, 0);
      scratchQuaternion.setFromEuler(scratchEuler);
      scratch.compose(scratchPosition, scratchQuaternion, scratchScale);

      mesh.setMatrixAt(i, scratch);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} visible={false} frustumCulled={false}>
      <meshStandardMaterial color="#FFE14A" metalness={0.7} roughness={0.25} />
    </instancedMesh>
  );
}

/** Sunrise disc that rises behind the alarm clock in the final CTA. */
function Sunrise() {
  const meshRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = meshRef.current;
    if (!group) return;

    const active = presence('cta') > 0;
    group.visible = active;
    if (!active) return;

    // Rises slowly out of the bottom edge, then holds.
    const t = clock.elapsedTime;
    group.position.y = MathUtils.lerp(group.position.y, -6.2 + Math.sin(t * 0.35) * 0.08, 0.02);
  });

  return (
    // Two discs: a wide warm halo and a bright core, so the sun reads as a
    // light source rather than a flat circle the same colour as the sky.
    <group ref={meshRef} position={[0, -7, -16]} visible={false}>
      <mesh>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial color="#FF9A3C" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <circleGeometry args={[4, 48]} />
        <meshBasicMaterial color="#FFE14A" transparent opacity={0.95} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** The big twin-bell alarm clock that rings once on entry. */
function AlarmClock() {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const active = presence('cta') > 0;
    group.visible = active;
    if (!active) return;

    // A shake that settles, repeating slowly rather than endlessly.
    const t = clock.elapsedTime;
    group.rotation.z = Math.sin(t * 14) * 0.03 * Math.max(0, 1 - (t % 3) / 2);
  });

  return (
    <group ref={groupRef} position={[4.2, -2.4, -7]} visible={false}>
      {/* Body */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 0.22, 28]} />
        <meshStandardMaterial color="#FF4F8B" roughness={0.45} />
      </mesh>
      {/* Bells */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.28, 0]} rotation={[0, 0, x > 0 ? -0.4 : 0.4]}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color="#FFE14A" roughness={0.4} metalness={0.2} />
        </mesh>
      ))}
      {/* Hands */}
      <mesh position={[0, 0.13, 0]} rotation={[0, 0, 1.1]}>
        <boxGeometry args={[0.03, 0.34, 0.03]} />
        <meshStandardMaterial color="#1A0B12" />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[0, 0, -2.2]}>
        <boxGeometry args={[0.03, 0.26, 0.03]} />
        <meshStandardMaterial color="#1A0B12" />
      </mesh>
    </group>
  );
}