'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, MathUtils, SRGBColorSpace, type Group } from 'three';
import { scrollState } from '@/lib/scroll-state';

/**
 * The sleeper.
 *
 * A stylized figure on a mat: capsule body, sphere head, striped pajamas from a
 * procedural canvas texture, closed eyes, a small smile and a blanket. Charming
 * and simple by design — a GLB override can replace it later without any call
 * site changing.
 *
 * Breathes gently, then recedes and fades once the visitor scrolls past the
 * hero, so the figure never competes with the copy in the sections below.
 */
export function Sleeper() {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const materials = useRef<Array<{ opacity: number; transparent: boolean }>>([]);

  const pajamaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Vertical stripes in the palette's pink and cream.
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

    // Slow rise and fall of the chest.
    const breath = Math.sin((clock.elapsedTime * Math.PI * 2) / 5) * 0.02;

    const depth = sectionDepth();
    // Hero and counter are close; after that the figure recedes into the night.
    const recede = MathUtils.clamp(depth, 0, 1);
    const lambda = 1 - Math.pow(0.0015, delta);

    group.position.y = -0.05 + breath - recede * 0.4;
    group.position.z = MathUtils.lerp(group.position.z, -recede * 14, lambda);
    group.position.x = MathUtils.lerp(
      group.position.x,
      depth <= 0 ? 0.4 : -2.4 - recede * 1.5,
      lambda,
    );
    group.scale.setScalar(MathUtils.lerp(1, 0.5, recede));

    // Fade out once we are well past the counter.
    const fade = 1 - recede;
    for (const material of materials.current) {
      if (material) {
        material.transparent = true;
        material.opacity = fade;
      }
    }

    if (head) {
      // The head tilts a little further asleep over time.
      head.rotation.z = MathUtils.lerp(head.rotation.z, 0.12, 1 - Math.pow(0.2, delta));
    }
  });

  return (
    <group ref={groupRef} position={[0.4, -0.05, 0.2]} rotation={[0, -0.35, 0]}>
      {/* Mat */}
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[3.4, 0.12, 1.9]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[0] = m;
          }}
          color="#3A2C78"
          roughness={0.9}
        />
      </mesh>

      {/* Blanket */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[2.3, 0.3, 1.7]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[1] = m;
          }}
          color="#FF4F8B"
          roughness={0.85}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.34, 1.25, 8, 20]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[2] = m;
          }}
          map={pajamaTexture ?? undefined}
          color={pajamaTexture ? '#ffffff' : '#FF4F8B'}
          roughness={0.75}
        />
      </mesh>

      {/* Head group, so it can tilt independently */}
      <group ref={headRef} position={[-0.95, 0.12, 0]}>
        <mesh>
          <sphereGeometry args={[0.36, 28, 20]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) materials.current[3] = m;
            }}
            color="#F2C9A8"
            roughness={0.85}
          />
        </mesh>

        {/* Sleep cap */}
        <mesh position={[0.02, 0.2, 0]} rotation={[0, 0, -0.35]}>
          <coneGeometry args={[0.3, 0.7, 16]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) materials.current[4] = m;
            }}
            color="#FF4F8B"
            roughness={0.7}
          />
        </mesh>

        {/* Closed eyes */}
        {[-0.12, 0.12].map((z) => (
          <mesh key={z} position={[-0.3, 0.02, z]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.07, 0.02, 8, 14, Math.PI]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m) materials.current[5] = m;
              }}
              color="#1A0B12"
              roughness={0.5}
            />
          </mesh>
        ))}

        {/* Small smile */}
        <mesh position={[-0.32, -0.12, 0]} rotation={[0, Math.PI / 2, Math.PI]}>
          <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) materials.current[6] = m;
            }}
            color="#1A0B12"
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}

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