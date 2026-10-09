'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  Points,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  type Group,
  type Texture,
} from 'three';
import { SETTINGS, type Tier } from '@/lib/quality';
import { presence, scrollState } from '@/lib/scroll-state';
import { seededRandom } from '@/lib/random';
import { asset } from '@/lib/assets';

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
      <Moonlight />
      <Stars count={settings.stars} />
      <Moon />
      {settings.dust > 0 ? <DustMotes count={settings.dust} /> : null}
      <LightShafts tier={tier} />
    </>
  );
}

/* Light ------------------------------------------------------------------ */

/**
 * The only light in the scene: a weak, cool key from the upper left, which is
 * the direction a northern-hemisphere moon is lit from. Everything else in the
 * atmosphere is either unlit (stars, dust) or additive (shafts), so a single
 * directional light is the whole lighting rig.
 *
 * Without it the moon rendered black: a Lambert material with no light source
 * has nothing to shade with.
 */
function Moonlight() {
  return (
    <directionalLight position={[-7, 2, 5]} intensity={2.4} color="#BFD0F0" />
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
    <group ref={ref} position={[5.6, 5.6, -12]}>
      <mesh>
        <sphereGeometry args={[1.1, 48, 32]} />
        <meshLambertMaterial
          map={moonTexture()}
          color={moonMap.exists ? '#ffffff' : '#C9CCDA'}
          emissive="#2A2F45"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* A soft halo. Additive and low, not a bloom pass. */}
      <mesh position={[-0.35, 0.1, -0.2]}>
        <sphereGeometry args={[2.1, 16, 12]} />
        <meshBasicMaterial
          color="#8FA6D8"
          transparent
          opacity={0.05}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The moon's surface, generated once and cached for the process.
 *
 * This was a three-octave 3D value-noise fragment shader, evaluated per pixel
 * per frame over a sphere. The surface of the moon does not change, so
 * recomputing it sixty times a second was waste by construction: baking it to a
 * texture once turns a heavy shader into a texture fetch and removes the single
 * most expensive shader on the page.
 *
 * Equirectangular, so the maria read correctly from any viewing angle.
 */
let moon: Texture | null = null;

/** A public-domain NASA colour map, when one has been supplied. */
const moonMap = asset('images/moon-color');

function moonTexture(): Texture {
  if (moon) return moon;

  // The real lunar colour map wins: it is actual data, and no procedural
  // field is going to improve on it.
  if (moonMap.exists) {
    const loader = new TextureLoader();
    const texture = loader.load(moonMap.src);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    moon = texture;
    return texture;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 1) {
      // Latitude, so noise does not stretch towards the poles.
      const lat = (y / canvas.height - 0.5) * Math.PI;
      const ring = Math.cos(lat);
      for (let x = 0; x < canvas.width; x += 1) {
        const lon = (x / canvas.width) * Math.PI * 2;
        const n =
          fbm(Math.sin(lat) * 3.2 + 4, Math.cos(lat) * 3.2, Math.cos(lon) * 3.2 * ring + 7) * 0.65 +
          fbm(Math.sin(lat) * 9 + 11, Math.cos(lat) * 9, Math.cos(lon) * 9 * ring + 13) * 0.35;

        // Maria are the dark, smooth patches; the highlands are brighter.
        const v = 96 + n * 132;
        const i = (y * canvas.width + x) * 4;
        image.data[i] = v * 1.02;
        image.data[i + 1] = v * 1.0;
        image.data[i + 2] = v * 0.95;
        image.data[i + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);

    // A handful of craters with a lit rim and a shadowed floor.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 90; i += 1) {
      const cx = ((i * 97) % canvas.width) + (i % 5);
      const cy = ((i * 53) % canvas.height) + (i % 3);
      const r = 2 + ((i * 7) % 9);
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.30)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  moon = texture;
  return texture;
}

/** Cheap deterministic 3D value noise, used only while baking the moon. */
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(
      lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx),
      lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx),
      fy,
    ),
    lerp(
      lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx),
      lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx),
      fy,
    ),
    fz,
  );
}

function fbm(x: number, y: number, z: number): number {
  return (
    noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.1
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