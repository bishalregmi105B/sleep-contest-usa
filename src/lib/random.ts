/**
 * Deterministic pseudo-random numbers.
 *
 * Scene geometry is generated during render, where `Math.random()` would make
 * the output differ between renders and between server and client. A seeded
 * generator gives the same star field and the same coins on every load, which
 * is both correct and cheaper to reason about.
 *
 * This is decoration, not cryptography. Never use it for ids or tokens; see
 * lib/ids.ts for those.
 */

/** mulberry32: small, fast, and good enough for scattering points. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a string into a stable seed, so each object gets its own field. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}