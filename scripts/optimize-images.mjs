#!/usr/bin/env node
/**
 * Turns the raw Stitch downloads into shippable site images.
 *
 * Two jobs:
 *  1. Crop out the UI chrome Stitch baked into the art (headlines, buttons,
 *     nav, jumbotron straps). The brief requires all text to be rendered in
 *     code, never baked into an image, so the crops below isolate the
 *     illustration only. See DESIGN_PLAN.md "Baked-in text".
 *  2. Re-encode to WebP (plus AVIF above a size threshold) and emit a tiny
 *     blur placeholder for next/image.
 *
 * Reads design/stitch/raw/ (read-only reference) and never modifies it.
 * Usage: node scripts/optimize-images.mjs
 */

import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'design/stitch/raw');
const OUT = path.join(ROOT, 'public/assets/images');
const AVIF_THRESHOLD = 150 * 1024;
const MAX_WIDTH = 2000;

/**
 * Crop windows in source pixels, chosen by eye against each downloaded file.
 * `{ top, height }` keeps full width. Applied before scaling.
 *
 * The Stitch art is 1024px wide. Most frames are 1024x559 with a headline and
 * CTA block occupying roughly the bottom 160px and a nav/logo the top ~25px.
 */
const CROPS = {
  // Row-brightness probing shows the baked logo occupies rows 7-64, so the
  // illustration proper starts at 66. The bottom block (headline, CTA, date)
  // is removed the same way.
  'hero-poster': { top: 66, height: 334 },
  'how-1-register': { top: 0, height: 520 },
  'how-2-pajamas': { top: 0, height: 559 },
  'how-3-leaderboard': { top: 0, height: 559 },
  'how-4-feather': { top: 0, height: 559 },
  'squad-noise': { top: 0, height: 559 },
  'squad-tickle': { top: 0, height: 559 },
  'squad-smell': { top: 0, height: 559 },
  'gallery-sleeping-floor': { top: 0, height: 559 },
  'gallery-squad-closeup': { top: 0, height: 559 },
  // The winner shot bakes in a fabricated cheque (invented name and amount) plus
  // "1ST PLACE" straps. Crop to the upper-left confetti burst and stage lights.
  'gallery-judge': { left: 0, top: 0, width: 430, height: 196 },
};

/** Images whose subject is off-centre and read better cropped tighter. */
const ASPECT = {
  'hero-poster': 16 / 10,
  'how-1-register': 16 / 9,
  'how-2-pajamas': 16 / 9,
  'how-3-leaderboard': 16 / 9,
  'how-4-feather': 16 / 9,
  'squad-noise': 16 / 9,
  'squad-tickle': 16 / 9,
  'squad-smell': 16 / 9,
  'gallery-sleeping-floor': 16 / 9,
  'gallery-squad-closeup': 16 / 9,
  'gallery-judge': 16 / 9,
};

async function main() {
  if (!existsSync(SRC)) {
    console.log('No raw Stitch assets found. Run scripts/fetch-stitch-images.mjs first.');
    return;
  }
  await mkdir(OUT, { recursive: true });

  const manifest = existsSync(path.join(ROOT, 'design/stitch/IMAGE_MANIFEST.json'))
    ? JSON.parse(await readFile(path.join(ROOT, 'design/stitch/IMAGE_MANIFEST.json'), 'utf8'))
    : {};

  const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const report = {};

  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    if (manifest[name] && manifest[name].ship === false) {
      console.log(`  skip ${name} (reference only)`);
      continue;
    }

    let pipeline = sharp(path.join(SRC, file)).rotate();

    const crop = CROPS[name];
    if (crop) {
      const meta = await pipeline.metadata();
      const srcW = meta.width ?? 1024;
      const srcH = meta.height ?? 559;
      const left = Math.min(crop.left ?? 0, srcW - 1);
      const top = Math.min(crop.top ?? 0, srcH - 1);
      const width = Math.min(crop.width ?? srcW, srcW - left);
      const height = Math.min(crop.height ?? srcH, srcH - top);
      pipeline = pipeline.extract({ left, top, width, height });
    }

    const aspect = ASPECT[name];
    const composed = aspect ? pipeline.resize({ aspect, fit: 'cover', position: 'attention' }) : pipeline;
    const sized = composed.resize({ width: MAX_WIDTH, withoutEnlargement: true });

    const webpName = `${name}.webp`;
    const info = await sized.clone().webp({ quality: 82, effort: 5 }).toFile(path.join(OUT, webpName));

    let avifName = null;
    if (info.size >= AVIF_THRESHOLD) {
      avifName = `${name}.avif`;
      await sized.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(OUT, avifName));
    }

    const blurBuf = await sized.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer();

    report[name] = {
      webp: `/assets/images/${webpName}`,
      avif: avifName ? `/assets/images/${avifName}` : null,
      width: info.width,
      height: info.height,
      bytes: info.size,
      cropped: Boolean(crop),
      blurDataURL: `data:image/webp;base64,${blurBuf.toString('base64')}`,
    };

    console.log(`  ${name}: ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} KB${avifName ? ' +avif' : ''}`);
  }

  await writeFile(
    path.join(ROOT, 'design/stitch/OPTIMIZED_IMAGES.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`\nWrote ${Object.keys(report).length} images -> public/assets/images/`);
}

async function readFile(p, enc) {
  const { readFile: rf } = await import('node:fs/promises');
  return rf(p, enc);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});