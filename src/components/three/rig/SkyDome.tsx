'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, type ShaderMaterial } from 'three';
import { sceneStateFor, scrollState } from '@/lib/scroll-state';

/**
 * Sky dome.
 *
 * A large inside-out sphere with a three-stop gradient. Colours are damped
 * toward the current section's sky, and the same values are written to CSS
 * custom properties so the no-WebGL fallback matches the 3D version exactly.
 *
 * Geometry and material are created once and disposed on unmount.
 */
const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBottom;
  uniform vec3 uMid;
  uniform vec3 uTop;
  varying vec3 vWorldPosition;

  void main() {
    // Map height to a 0..1 gradient parameter. The exponent matters: the dome
    // is far larger than the visible slice, so a linear mapping compresses the
    // whole gradient into a sliver and the sky reads as one flat colour.
    float h = normalize(vWorldPosition).y * 0.5 + 0.5;
    h = pow(clamp(h, 0.0, 1.0), 0.32);

    vec3 color = mix(uBottom, uMid, smoothstep(0.0, 0.52, h));
    color = mix(color, uTop, smoothstep(0.48, 1.0, h));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function SkyDome() {
  const materialRef = useRef<ShaderMaterial>(null);
  const lastWrite = useRef(0);

  // Colours are allocated once; useFrame must not allocate per frame.
  const targets = useMemo(
    () => ({
      bottom: new Color(),
      mid: new Color(),
      top: new Color(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;

    const state = sceneStateFor(scrollState.section.id);
    const lambda = 1 - Math.pow(0.001, delta);

    targets.bottom.set(state.sky[0]);
    targets.mid.set(state.sky[1]);
    targets.top.set(state.sky[2]);

    material.uniforms.uBottom!.value.lerp(targets.bottom, lambda);
    material.uniforms.uMid!.value.lerp(targets.mid, lambda);
    material.uniforms.uTop!.value.lerp(targets.top, lambda);

    // Mirror the sky into CSS about six times a second, not every frame:
    // writing custom properties forces style recalculation.
    lastWrite.current += delta;
    if (lastWrite.current > 0.16) {
      lastWrite.current = 0;
      const root = document.documentElement;
      const u = material.uniforms;
      root.style.setProperty('--sky-bottom', `#${(u.uBottom!.value as Color).getHexString()}`);
      root.style.setProperty('--sky-mid', `#${(u.uMid!.value as Color).getHexString()}`);
      root.style.setProperty('--sky-top', `#${(u.uTop!.value as Color).getHexString()}`);
    }
  });

  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[50, 32, 24]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={BackSide}
        depthWrite={false}
        uniforms={{
          uBottom: { value: new Color('#FF9A3C') },
          uMid: { value: new Color('#FF4F8B') },
          uTop: { value: new Color('#3A2C78') },
        }}
      />
    </mesh>
  );
}