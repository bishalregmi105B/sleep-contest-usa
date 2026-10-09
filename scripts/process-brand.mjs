#!/usr/bin/env node
/**
 * Processes the client's brand assets.
 *
 *   npm run assets:brand
 *
 * The client supplied the record-attempt logo as a 1200x900 PNG on a white
 * background with wide margins. Browsers do not crop, so those margins become
 * dead space around the mark and shrink it on the page. This trims them, then
 * writes PNG and WebP at 1x and 2x.
 *
 * ## What it deliberately does not do
 *
 * No recolouring, no stretching, no cropping into the mark, no effects. The
 * clear space and the proportions of a licensed logo are part of how it may be
 * used, and the component renders it on a solid light plate to preserve them.
 *
 * Usage:
 *   node scripts/process-brand.mjs [input.png]
 */

import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/assets/brand');

const SOURCE_NAME = 'gwr-official-attempt.png';
const input = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(OUT_DIR, 'source', SOURCE_NAME);

if (!existsSync(input)) {
  console.error(
    `No source image found.\n\n` +
      `  Expected: public/assets/brand/source/${SOURCE_NAME}\n` +
      `  (a 1200x900 PNG on white, as supplied)\n\n` +
      `  Or pass one: node scripts/process-brand.mjs path/to/logo.png\n`,
  );
  process.exit(1);
}

const { default: sharp } = await import('sharp');

await mkdir(OUT_DIR, { recursive: true });

// Trim the surrounding white, then restore a small safe margin of our own so
// the clear space around the mark is deliberate rather than whatever was left.
const trimmed = await sharp(await sharp(input).trim({ threshold: 10 }).toBuffer())
  .extend({
    top: 24, bottom: 24, left: 24, right: 24,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .toBuffer();

const meta = await sharp(trimmed).metadata();
console.log(
  `source   ${path.relative(ROOT, input)}  ${meta.width}x${meta.height}\n` +
    `trimmed  ${meta.width}x${meta.height}  (white margins removed, 24px safe margin added)`,
);

// 1x and 2x, PNG and WebP. The component prefers WebP and falls back to PNG.
const outputs = [
  { name: 'gwr-official-attempt.png', width: meta.width },
  { name: 'gwr-official-attempt@2x.png', width: meta.width * 2 },
];

for (const output of outputs) {
  const resized = await sharp(trimmed).resize({ width: output.width }).toBuffer();
  await sharp(resized).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, output.name));
  const webp = output.name.replace(/\.png$/, '.webp');
  await sharp(resized).webp({ quality: 90 }).toFile(path.join(OUT_DIR, webp));
  const info = await stat(path.join(OUT_DIR, output.name));
  console.log(`wrote    ${output.name} and ${webp}  (${Math.round(info.size / 1024)} kB)`);
}

console.log('\ndone. The badge appears as soon as one of these exists; no rebuild of settings needed.');
