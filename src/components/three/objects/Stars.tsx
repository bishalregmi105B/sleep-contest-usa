'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type Points } from 'three';
import { scrollState } from '@/lib/scroll-state';
import { seedFrom, seededRandom } from '@/lib/random';

/**
 * Stars.
 *
 * One Points object with a per-star phase attribute. Twinkle happens in the
 * vertex shader so it costs nothing on the CPU. The count comes from the
 * quality tier, and the whole field brightens as the sky reaches midnight.
 */
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  attribute float aPhase;
  attribute float aSize;
  varying float vAlpha;

  void main() {
    // Each star pulses on its own phase, slowly and out of step.
    float twinkle = 0.55 + 0.45 * sin(uTime * 0.8 + aPhase * 6.28318);
    vAlpha = twinkle * uOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    // Soft round point with a bright core.
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(1.0, 0.97, 0.91, alpha);
  }
`;

export function Stars({ count }: { readonly count: number }) {
  const materialRef = useRef<{ uniforms: Record<string, { value: number }> }>(null);
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => {
    // Seeded, so the star field is identical on every load and between server
    // and client renders.
    const random = seededRandom(seedFrom('stars'));

    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      // Upper hemisphere only, spread wide and far back.
      const radius = 18 + random() * 16;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(random() * 0.85 + 0.1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 4;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      phases[i] = random();
      sizes[i] = 0.6 + random() * 1.8;
    }

    return { positions, phases, sizes };
  }, [count]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime!.value += delta;

    // Stars are a midnight idea: they fade in as the sky darkens.
    const darkness = clamp01(1 - scrollState.progress * 3);
    material.uniforms.uOpacity!.value = 0.35 + darkness * 0.65;

    // Slow drift with scroll, so the field parallaxes rather than sitting still.
    if (pointsRef.current) {
      pointsRef.current.rotation.y = scrollState.progress * 0.6;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[geometry.positions, 3]}
        />
        <bufferAttribute attach="attributes-aPhase" args={[geometry.phases, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[geometry.sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: 0.8 },
        }}
      />
    </points>
  );
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}