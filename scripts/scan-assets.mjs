#!/usr/bin/env node
/**
 * Scans public/assets and public/models and writes src/lib/assets.generated.json.
 *
 * The site builds and looks complete with no generated assets: every 3D object
 * is procedural and every image has a CSS fallback. Dropping a real file into
 * public/ upgrades it automatically with no code change.
 *
 * Runs on predev and prebuild. Usage: node scripts/scan-assets.mjs
 */

import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROOTS = ['public/assets/images', 'public/assets/video', 'public/models'];
const OUT = path.join(ROOT, 'src/lib/assets.generated.json');

/** Extension preference when several variants of the same asset exist. */
const PREFERRED = ['.webp', '.avif', '.png', '.jpg', '.jpeg', '.glb', '.mp4', '.webm'];

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const found = [];
  for (const rel of ROOTS) {
    found.push(...(await walk(path.join(ROOT, rel))));
  }

  const assets = {};
  for (const abs of found) {
    const url = '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');
    // /assets/images/hero-poster.webp -> hero-poster
    const key = url
      .replace(/^\/assets\//, '')
      .replace(/^(images|video|audio)\//, '')
      .replace(/\.[^.]+$/, '');
    const ext = path.extname(abs).toLowerCase();
    const info = await stat(abs);

    const existing = assets[key];
    // Keep the best available variant for a key.
    const better =
      !existing ||
      PREFERRED.indexOf(ext) < PREFERRED.indexOf(path.extname(existing.src).toLowerCase()) ||
      (existing.src.endsWith(ext) && info.size < existing.bytes);

    if (better) {
      assets[key] = { src: url, bytes: info.size, exists: true };
    }
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(assets, null, 2)}\n`);

  const count = Object.keys(assets).length;
  console.log(`assets:scan -> ${count} asset${count === 1 ? '' : 's'} (${OUT.replace(`${ROOT}/`, '')})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});