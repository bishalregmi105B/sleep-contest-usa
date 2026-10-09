'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  Points,
  ShaderMaterial,
  type Group,
} from 'three';
import { SETTINGS, type Tier } from '@/lib/quality';
import { presence, scrollState } from '@/lib/scroll-state';
import { seededRandom } from '@/lib/random';

/**
 * The atmosphere layer.
 *
 * Everything that is not an object: stars, a moon with no face, dust and light
 * shafts. Realism here comes from restraint and from how things are lit, not
 * from detail. There is no sleeping figure, no face, no extruded lettering and
 * no mascot anywhere in this scene.
 */
export function Atmosphere({ tier }: { readonly tier: Tier }) {
  const settings = SETTINGS[tier === 'none' ? 'low' : tier];

  return (
    <>
      {/* No sky dome: the CSS cinematic stage paints the sky, and a sphere
          fighting it would double-expose every horizon. */}
      <Stars count={settings.stars} />
      <Moon />
      {settings.dust > 0 ? <DustMotes count={settings.dust} /> : null}
      <LightShafts tier={tier} />
    </>
  );
}

/* Stars ------------------------------------------------------------------ */

/**
 * A few bright, mostly faint. Brightness follows a power law so the eye reads
 * depth rather than a uniform spray of dots. Scintillation is very slow and
 * one-directional; the old twinkle bounced, which read as cartoon sparkle.
 */
function Stars({ count }: { readonly count: number }) {
  const ref = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const rnd = seededRandom(i * 3 + 1);
      // Spread across the upper hemisphere, behind the content.
      positions[i * 3] = (rnd() - 0.5) * 60;
      positions[i * 3 + 1] = (rnd() * 0.8 + 0.1) * 40;
      positions[i * 3 + 2] = -rnd() * 40 - 6;

      // Power law: most stars are faint, a handful are bright.
      sizes[i] = 0.6 + Math.pow(rnd(), 3) * 1.2;
      phases[i] = rnd() * Math.PI * 2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new BufferAttribute(phases, 1));
    return geo;
  }, [count]);

    const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.9 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aPhase;
          uniform float uTime;
          varying float vAlpha;

          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * (300.0 / -mv.z);

            // Very slow, shallow scintillation. No bounce.
            float twinkle = 0.82 + 0.18 * sin(uTime * 0.35 + aPhase);
            // Fade stars out near the bottom of the frame so the horizon stays
            // clean and text always clears them.
            float height = smoothstep(0.0, 14.0, position.y);
            vAlpha = twinkle * mix(0.15, 1.0, height);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vAlpha;

          void main() {
            // A soft round point, not a hard square.
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vec3(0.92, 0.93, 1.0), alpha * vAlpha * uOpacity);
          }
        `,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points) return;
    const uniforms = (points.material as ShaderMaterial).uniforms;
    uniforms.uTime!.value = clock.elapsedTime;
    // Stars recede at dawn, where the sky is doing the work instead.
    uniforms.uOpacity!.value =
      scrollState.section.id === 'cta' ? 0.35 : scrollState.section.id === 'hero' ? 0.95 : 0.75;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/* Moon ------------------------------------------------------------------- */

/**
 * A waxing crescent with no face and no nightcap.
 *
 * Lit from the left, as a crescent is in the northern hemisphere, and shaded
 * with a procedural crater field rather than a flat disc. If a public-domain
 * NASA colour map has been dropped at public/assets/images/moon-color.webp this
 * would use it; until then the procedural version carries it.
 */
function Moon() {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;

    // Hero only. Elsewhere it is a distraction behind the content.
    const amount = presence('hero');
    group.visible = amount > 0;
    if (!group.visible) return;

    const lambda = 1 - Math.pow(0.02, delta);
    const parallax = scrollState.tier === 'low' ? 0.1 : 0.4;
    group.position.x += (5.2 + scrollState.pointer.x * parallax - group.position.x) * lambda;
    group.position.y += (5.6 - scrollState.pointer.y * parallax * 0.5 - group.position.y) * lambda;
  });

  return (
    <group ref={ref} position={[5.2, 5.6, -12]}>
      <mesh>
        <sphereGeometry args={[1.1, 48, 32]} />
        <shaderMaterial
          transparent
          uniforms={{ uOpacity: { value: 1 } }}
          vertexShader={/* glsl */ `
            varying vec3 vNormal;
            varying vec3 vPos;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uOpacity;
            varying vec3 vNormal;
            varying vec3 vPos;

            // Cheap value noise, enough for a crater field at this size.
            float hash(vec3 p) {
              p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
              p *= 17.0;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }

            float noise(vec3 x) {
              vec3 i = floor(x);
              vec3 f = fract(x);
              f = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                    mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                    mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
            }

            void main() {
              // Lit from the left, the way a northern-hemisphere crescent is.
              vec3 lightDir = normalize(vec3(-0.75, 0.2, 0.6));
              float lambert = max(0.0, dot(normalize(vNormal), lightDir));

              // Three octaves is enough for maria and craters at this scale.
              float n = noise(vPos * 3.5) * 0.6
                      + noise(vPos * 9.0) * 0.3
                      + noise(vPos * 22.0) * 0.1;

              vec3 dark = vec3(0.36, 0.37, 0.44);
              vec3 light = vec3(0.88, 0.88, 0.86);
              vec3 albedo = mix(dark, light, n);

              // A cool moon in a warm scene: never pure white, which would
              // blow out against the sky.
              vec3 color = albedo * (0.38 + lambert * 1.25);
              color += vec3(0.12, 0.14, 0.24) * pow(1.0 - lambert, 2.0) * 0.6;

              float alpha = smoothstep(0.02, 0.16, lambert) * uOpacity;
              gl_FragColor = vec4(color, alpha);
            }
          `}
        />
      </mesh>

      {/* A soft halo. Additive and low, not a bloom pass. */}
      <mesh position={[-0.35, 0.1, -0.2]}>
        <sphereGeometry args={[2.1, 16, 12]} />
        <meshBasicMaterial color="#8FA6D8" transparent opacity={0.05} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* Dust ------------------------------------------------------------------- */

/** Slow motes hanging in the light. 120 on high, 60 on medium. */
function DustMotes({ count }: { readonly count: number }) {
  const ref = useRef<Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const rnd = seededRandom(i * 7 + 13);
      positions[i * 3] = (rnd() - 0.5) * 22;
      positions[i * 3 + 1] = (rnd() - 0.5) * 12;
      positions[i * 3 + 2] = rnd() * 6 - 3;
      phases[i] = rnd() * Math.PI * 2;
      scales[i] = 0.6 + rnd() * 0.8;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new BufferAttribute(phases, 1));
    geo.setAttribute('aScale', new BufferAttribute(scales, 1));
    return geo;
  }, [count]);

    const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aPhase;
          attribute float aScale;
          uniform float uTime;
          varying float vFade;

          void main() {
            vec3 p = position;
            // A slow drift, well under a body length per second.
            p.x += sin(uTime * 0.08 + aPhase) * 0.6;
            p.y += cos(uTime * 0.05 + aPhase * 1.7) * 0.35;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aScale * 0.02 * (300.0 / -mv.z);
            vFade = 0.25 * (0.6 + 0.4 * sin(uTime * 0.2 + aPhase * 3.0));
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vFade;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(1.0, 0.86, 0.68, smoothstep(0.5, 0.0, d) * vFade);
          }
        `,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points) return;
    (points.material as ShaderMaterial).uniforms.uTime!.value = clock.elapsedTime;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/* Light shafts ----------------------------------------------------------- */

/**
 * Two or three additive cones in warm tungsten. These stand in for the stadium
 * work lights, which is the only practical light source in the story.
 */
function LightShafts({ tier }: { readonly tier: Tier }) {
  const refs = useRef<Array<Mesh | null>>([]);
  const materials = useRef<Array<ShaderMaterial | null>>([]);

  const shafts = tier === 'high' ? 3 : 2;
  const strength = tier === 'high' ? 0.12 : 0.08;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const section = scrollState.section.id;

    for (let i = 0; i < shafts; i += 1) {
      const mesh = refs.current[i];
      const material = materials.current[i];
      if (!mesh || !material) continue;

      // Each shaft belongs to the section it lights.
      const wanted =
        section === 'squad' || section === 'prizes'
          ? strength
          : section === 'cta'
            ? strength * (1.1 + Math.sin(t * 0.2) * 0.1)
            : section === 'reserve'
              ? strength * 0.6
              : 0;

      // Rounds pulse: the squad flashes a 300ms tungsten pulse per round.
      const pulse = section === 'squad' ? 0.18 * Math.max(0, Math.sin(t * 2.1)) : 0;
      const target = Math.max(0, wanted + pulse);
      material.uniforms.uOpacity!.value +=
        (target - material.uniforms.uOpacity!.value) * 0.08;

      mesh.visible = material.uniforms.uOpacity!.value > 0.005;
    }
  });

  return (
    <>
      {Array.from({ length: shafts }, (_, i) => {
        const spread = (i - (shafts - 1) / 2) * 7;
        return (
          <mesh
            key={i}
            ref={(node: Mesh | null) => {
              refs.current[i] = node;
            }}
            position={[spread, -2, -6 - i * 2]}
            rotation={[0, 0, spread * 0.012]}
          >
            <coneGeometry args={[2.4, 16, 24, 1, true]} />
            <shaderMaterial
              ref={(node: ShaderMaterial | null) => {
                materials.current[i] = node;
              }}
              transparent
              depthWrite={false}
              side={DoubleSide}
              blending={AdditiveBlending}
              uniforms={{
                uOpacity: { value: 0 },
                uColor: { value: new Color('#FFB867') },
              }}
              vertexShader={/* glsl */ `
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={/* glsl */ `
                uniform float uOpacity;
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                  // Bright at the narrow top, fading toward the floor.
                  float vertical = pow(1.0 - vUv.y, 1.6);
                  // Soft at the cone edges so there is no visible hard rim.
                  float edge = sin(vUv.x * 3.14159);
                  gl_FragColor = vec4(uColor, uOpacity * vertical * edge);
                }
              `}
            />
          </mesh>
        );
      })}
    </>
  );
}