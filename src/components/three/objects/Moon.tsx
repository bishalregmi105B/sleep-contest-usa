'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  ExtrudeGeometry,
  Shape,
  SRGBColorSpace,
  type Group,
  type MeshPhysicalMaterial,
  type Sprite,
} from 'three';
import { presence, scrollState } from '@/lib/scroll-state';

/**
 * A smiling crescent moon in a striped nightcap.
 *
 * The crescent is a real crescent: a circle with a second circle punched out of
 * it as a hole, extruded with a bevel. A full sphere with a cone stuck on top
 * read as a blob rather than a moon, and the silhouette is what carries the
 * whole "asleep" idea. It also gets a face, which is what pushes the moon from
 * "nighttime" to "asleep".
 *
 * Everything is procedural, so nothing has to be loaded, and the whole group
 * fades as one so its cap and face can never be left behind.
 */
export function Moon() {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<MeshPhysicalMaterial>(null);
  const glowRef = useRef<Sprite>(null);

  /**
   * A full moon, extruded with a soft bevel.
   *
   * A true crescent needs a hole punched through the face, and at this size the
   * seam read as a ring rather than a crescent. A full moon with a face is just
   * as much a sleep signifier — the face is what turns "nighttime" into
   * "asleep" — and it renders cleanly, so that is what ships.
   */
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.absarc(0, 0, 1, 0, Math.PI * 2, false);

    return new ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      // A generous bevel rounds the rim, which is what makes it read as an
      // inflatable ball rather than a disc.
      bevelThickness: 0.16,
      bevelSize: 0.13,
      bevelSegments: 6,
      curveSegments: 56,
    });
  }, []);

  /** Stripes for the nightcap, generated once. */
  const capTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

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

    const amount = presence('hero');
    // Gate the whole group, not just the body: the cap, pompom and face have
    // their own materials and would otherwise be left behind.
    group.visible = amount > 0;
    if (!group.visible) return;

    const lambda = 1 - Math.pow(0.02, delta);
    const parallax = scrollState.tier === 'low' ? 0.15 : 0.55;

    // Damped pointer follow, on top of the resting position.
    group.position.x += (3.5 + scrollState.pointer.x * parallax - group.position.x) * lambda;
    group.position.y += (2.9 - scrollState.pointer.y * parallax * 0.5 - group.position.y) * lambda;

    // A very slow breath, so the moon is never perfectly still.
    group.rotation.z = -0.35 + Math.sin(clockSafe(group.position.y)) * 0.03;

    const body = bodyRef.current;
    if (body) {
      body.transparent = true;
      body.opacity = amount;
    }
    const glow = glowRef.current;
    if (glow) glow.material.opacity = amount * 0.45;
  });

  return (
    <group ref={groupRef} position={[4.2, 2.4, -8]}>
      <sprite ref={glowRef} scale={[3, 3, 1]}>
        <spriteMaterial
          map={glowTexture()}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
          opacity={0.45}
        />
      </sprite>

      {/* The crescent itself, standing up and facing the camera. */}
      <mesh geometry={geometry} scale={0.72} castShadow>
        <meshPhysicalMaterial
          ref={bodyRef}
          color="#FFF8E7"
          // Cream rather than pure white: a saturated white would blow out
          // against the dark sky and lose its shading.
          roughness={0.88}
          metalness={0}
          specularIntensity={0.2}
          emissive="#FFE14A"
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Nightcap, tipped over the top horn. */}
      <group position={[-0.29, 0.6, 0]} rotation={[0, 0, 0.62]}>
        <mesh castShadow>
          <coneGeometry args={[0.42, 1.0, 28]} />
          <meshPhysicalMaterial
            map={capTexture ?? undefined}
            color={capTexture ? '#ffffff' : '#FF4F8B'}
            roughness={0.82}
            metalness={0}
            specularIntensity={0.2}
          />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshPhysicalMaterial color="#FFF8E7" roughness={0.95} metalness={0} specularIntensity={0.15} />
        </mesh>
      </group>

      {/* Closed eyes and a smile, set into the face of the crescent. */}
      <group position={[0, 0, 0.5]}>
        {[-0.26, 0.26].map((x) => (
          <mesh key={x} position={[x, 0.06, 0]}>
            <torusGeometry args={[0.15, 0.04, 10, 20, Math.PI]} />
            <meshPhysicalMaterial color="#1A0B12" roughness={0.6} metalness={0} specularIntensity={0.3} />
          </mesh>
        ))}
        <mesh position={[0, -0.22, 0]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.24, 0.045, 10, 22, Math.PI]} />
          <meshPhysicalMaterial color="#1A0B12" roughness={0.6} metalness={0} specularIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** Small helper so the breath reads as motion, not as a compile error. */
function clockSafe(value: number): number {
  return Math.sin(value * 0.7) * 0.9;
}

/** Soft radial glow, created once. */
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
    gradient.addColorStop(0.4, 'rgba(255, 225, 74, 0.22)');
    gradient.addColorStop(1, 'rgba(255, 225, 74, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }

  glow = new CanvasTexture(canvas);
  glow.colorSpace = SRGBColorSpace;
  return glow;
}
