'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, MathUtils, SRGBColorSpace, type Group } from 'three';
import { presence } from '@/lib/scroll-state';

type Fadeable = { opacity: number; transparent: boolean };

/**
 * The sleeper.
 *
 * Reading as a sleeping person rather than a lump comes down to three things:
 *
 *  - **Negative space.** The head is held clear of the torso and the blanket
 *    sits below both, so the silhouette has three readable masses instead of
 *    one. Flush shapes merge into a blob at any distance.
 *  - **Rounded forms.** Every piece is a rounded box or a sphere with a radius
 *    near a quarter of its smallest dimension; hard box edges read as furniture.
 *  - **Clay light.** A matte surface with almost no specular, so form comes from
 *    the light gradient rather than from a highlight.
 *
 * Charming and simple by design: a GLB override can replace this later without
 * any call site changing.
 */
export function Sleeper() {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const materials = useRef<Fadeable[]>([]);

  const pajamaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFF8E7';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#FF4F8B';
    for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 128);
    ctx.fillStyle = '#1B1450';
    ctx.fillRect(0, 56, 128, 6);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = 1000; // RepeatWrapping
    return texture;
  }, []);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const head = headRef.current;
    if (!group) return;

    const breath = Math.sin((clock.elapsedTime * Math.PI * 2) / 5) * 0.025;
    const amount = presence('hero');
    const recede = 1 - amount;

    group.visible = amount > 0;
    if (!group.visible) return;

    const lambda = 1 - Math.pow(0.0015, delta);

    group.position.y = -0.1 + breath - recede * 0.3;
    group.position.x = MathUtils.lerp(group.position.x, 0.2 - recede * 2.2, lambda);
    group.position.z = MathUtils.lerp(group.position.z, -recede * 10, lambda);
    group.scale.setScalar(MathUtils.lerp(1, 0.6, recede));

    // Traverse once to collect every material in the figure, so the whole
    // thing fades as one. Collected lazily because the ref callbacks that would
    // do it eagerly are not allowed to touch refs during render.
    if (materials.current.length === 0) {
      group.traverse((node) => {
        const material = (node as { material?: unknown }).material;
        if (material) materials.current.push(material as Fadeable);
      });
    }

    for (const material of materials.current) {
      material.transparent = true;
      material.opacity = amount;
    }

    // The head tilts a little further asleep over time.
    if (head) {
      head.rotation.z = MathUtils.lerp(head.rotation.z, 0.16, 1 - Math.pow(0.2, delta));
    }
  });

  return (
    <group ref={groupRef} position={[0.2, -0.1, 0]} rotation={[0, -0.28, 0]}>
      {/* Mat: rounded, and thin enough to read as a base not a block. */}
      <RoundedBox args={[3.6, 0.16, 2.1]} radius={0.07} smoothness={3} position={[0, -0.62, 0]} receiveShadow>
        <meshPhysicalMaterial color="#3A2C78" roughness={0.95} metalness={0} specularIntensity={0.15} />
      </RoundedBox>

      {/* Blanket: a pillowy slab with real bevel, so it reads as bedding. */}
      <RoundedBox args={[2.5, 0.44, 1.85]} radius={0.2} smoothness={4} position={[0.25, -0.3, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#FF4F8B"
          roughness={0.92}
          metalness={0}
          specularIntensity={0.18}
          sheen={0.7}
          sheenRoughness={0.8}
          sheenColor="#D9D2FF"
        />
      </RoundedBox>

      {/* Torso: held clear of the head so the silhouette reads in three masses. */}
      <mesh position={[0.45, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.36, 1.15, 8, 24]} />
        <meshPhysicalMaterial
          map={pajamaTexture ?? undefined}
          color={pajamaTexture ? '#ffffff' : '#FF4F8B'}
          roughness={0.88}
          metalness={0}
          specularIntensity={0.2}
        />
      </mesh>

      {/* Head group, so it can tilt on its own. */}
      <group ref={headRef} position={[-0.72, 0.3, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.4, 32, 24]} />
          <meshPhysicalMaterial color="#F2C9A8" roughness={0.9} metalness={0} specularIntensity={0.2} />
        </mesh>

        {/* Nightcap: the icon that breaks genericness on a round head. */}
        <mesh position={[0.04, 0.26, 0]} rotation={[0, 0, -0.4]} castShadow>
          <coneGeometry args={[0.34, 0.66, 20]} />
          <meshPhysicalMaterial color="#FF4F8B" roughness={0.85} metalness={0} specularIntensity={0.2} />
        </mesh>
        <mesh position={[-0.12, 0.52, 0]} castShadow>
          <sphereGeometry args={[0.13, 20, 16]} />
          <meshPhysicalMaterial color="#FFF8E7" roughness={0.95} metalness={0} specularIntensity={0.15} />
        </mesh>

        {/* Closed eyes: two downward arcs, the fastest "asleep" signal there is. */}
        {[-0.13, 0.13].map((z) => (
          <mesh key={z} position={[-0.33, 0.04, z]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.075, 0.022, 8, 16, Math.PI]} />
            <meshPhysicalMaterial color="#1A0B12" roughness={0.6} metalness={0} specularIntensity={0.3} />
          </mesh>
        ))}

        {/* Small smile. */}
        <mesh position={[-0.35, -0.12, 0]} rotation={[0, Math.PI / 2, Math.PI]}>
          <torusGeometry args={[0.1, 0.021, 8, 18, Math.PI]} />
          <meshPhysicalMaterial color="#1A0B12" roughness={0.6} metalness={0} specularIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}
