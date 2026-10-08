'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  type Sprite,
  CanvasTexture,
  SRGBColorSpace,
  type Group,
  type MeshStandardMaterial,
} from 'three';
import { presence, scrollState } from '@/lib/scroll-state';

/**
 * Smiling moon in a striped nightcap.
 *
 * Everything is procedural: the crescent is a sphere with a glow sprite, the
 * cap is a cone with a canvas-drawn stripe texture, and the closed eyes and
 * smile are partial torus arcs. Follows the pointer with damping.
 */
export function Moon() {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<MeshStandardMaterial>(null);
  const glowRef = useRef<Sprite>(null);

  // Stripe texture for the nightcap, generated once.
  const capTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Pillow pink and Zzz yellow stripes, matching the palette.
    const bands = ['#FF4F8B', '#FFF8E7', '#FFE14A', '#FF4F8B', '#FFF8E7'];
    bands.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, index * 13, 64, 13);
    });

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // The moon is the one object that survives the whole scroll, because it is
    // the through-line. It dims and drifts back so it never competes with copy.
    const amount = presence('hero');

    // The whole group, not just the body: the cap, pompom and face have their
    // own materials and would otherwise keep rendering at full opacity.
    group.visible = amount > 0;
    if (!group.visible) return;

    const body = bodyRef.current;
    if (body) {
      body.transparent = true;
      body.opacity = amount;
    }

    const glow = glowRef.current;
    if (glow) glow.material.opacity = amount * 0.4;

    const lambda = 1 - Math.pow(0.02, delta);
    const parallax = scrollState.tier === 'low' ? 0.15 : 0.5;

    // Damped pointer follow, on top of the resting position.
    group.position.x += (2.1 + scrollState.pointer.x * parallax - group.position.x) * lambda;
    group.position.y += (2.4 - scrollState.pointer.y * parallax * 0.5 - group.position.y) * lambda;

    // A very slow breath, so the moon is never perfectly still.
    group.rotation.z = Math.sin(group.position.y) * 0.02;
  });

  return (
    <group ref={groupRef} position={[4.6, 3.6, -6]}>
      {/* Glow */}
      <sprite ref={glowRef} scale={[1.8, 1.8, 1]}>
        <spriteMaterial
          map={glowTexture()}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          opacity={0.4}
        />
      </sprite>

      {/* Crescent body */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 24]} />
        <meshStandardMaterial
          ref={bodyRef}
          color="#FFF8E7"
          emissive="#FFE14A"
          emissiveIntensity={0.12}
          roughness={0.85}
        />
      </mesh>

      {/* Nightcap: a cone tipped over the top of the moon */}
      <group position={[0.04, 0.53, 0]} rotation={[0.35, 0, -0.5]}>
        <mesh>
          <coneGeometry args={[0.3, 0.85, 20]} />
          <meshStandardMaterial
            map={capTexture ?? undefined}
            color={capTexture ? '#ffffff' : '#FF4F8B'}
            roughness={0.6}
          />
        </mesh>
        {/* Pompom */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color="#FFF8E7" roughness={0.8} />
        </mesh>
      </group>

      {/* Closed eyes: two arcs */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.02, 0.57]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]}>
          <torusGeometry args={[0.08, 0.022, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#1A0B12" roughness={0.5} />
        </mesh>
      ))}

      {/* Smile */}
      <mesh position={[0, -0.2, 0.57]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.14, 0.026, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#1A0B12" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Soft radial glow sprite, created once. */
let glow: CanvasTexture | null = null;
function glowTexture(): CanvasTexture {
  if (glow) return glow;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 225, 74, 0.85)');
    gradient.addColorStop(0.4, 'rgba(255, 225, 74, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 225, 74, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  glow = new CanvasTexture(canvas);
  glow.colorSpace = SRGBColorSpace;
  return glow;
}

