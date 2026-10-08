#!/usr/bin/env node
/**
 * Downloads the remote Google CDN images referenced by the Stitch export.
 *
 * Stitch hotlinks generated art from lh3.googleusercontent.com URLs that expire.
 * This script pulls every referenced image once, writes it to
 * public/assets/stitch/<slug>.<ext> and records the mapping in
 * design/stitch/IMAGE_MANIFEST.json so references can be rewritten locally.
 *
 * Usage: node scripts/fetch-stitch-images.mjs
 * Failures are logged, never fatal: the site ships procedural fallbacks.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'design/stitch/raw');
const MANIFEST = path.join(ROOT, 'design/stitch/IMAGE_MANIFEST.json');
const SOURCES = [
  'design/stitch/the_great_america_s_sleep_contest_landing_page/code.html',
  'design/stitch/the_great_america_s_sleep_contest_interactive_3d_experience/code.html',
  'design/stitch/three.js/code.html',
];

/** Stable, human-meaningful slugs in document order. */
const SLUGS = [
  // 1 is the logo mark. It has the word "rubik" baked into the art, so it is
  // reference-only and never shipped as brand art; the header mark is built in code.
  'logo-reference',
  'hero-poster',
  'how-1-register',
  'how-2-pajamas',
  'how-3-leaderboard',
  'how-4-feather',
  'squad-noise',
  'squad-tickle',
  'squad-smell',
  'gallery-sleeping-floor',
  'gallery-squad-closeup',
  'gallery-judge',
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Collect URLs in the order they appear in the first source that has them.
  const seen = new Set();
  const urls = [];
  for (const rel of SOURCES) {
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const html = await readFile(abs, 'utf8');
    const found = html.match(/https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9_\-=/.]+/g) ?? [];
    for (const url of found) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push({ url, source: rel });
    }
  }

  console.log(`Found ${urls.length} unique remote images.`);

  const manifest = {};
  for (const [i, { url, source }] of urls.entries()) {
    const slug = SLUGS[i] ?? `stitch-image-${i + 1}`;
    const existing = Object.values(manifest).find((e) => e.remoteUrl === url);
    if (existing) continue;

    try {
      // Google CDN accepts a size suffix; without it we only get a 512px thumbnail.
      // w1024 is the largest variant these generated assets are served at.
      const sized = `${url}=w1024`;
      const res = await fetch(sized, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? 'image/jpeg';
      if (!type.startsWith('image/')) throw new Error(`not an image (content-type ${type})`);
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const buf = Buffer.from(await res.arrayBuffer());
      const file = `${slug}.${ext}`;
      await writeFile(path.join(OUT_DIR, file), buf);
      // Reference-only art is recorded so it stays traceable, but the optimizer
      // is told to skip it so it can never ship by accident.
      manifest[slug] = {
        remoteUrl: url,
        sourceFile: `design/stitch/raw/${file}`,
        bytes: buf.length,
        source,
        ship: slug !== 'logo-reference',
      };
      console.log(`  ok   ${slug} -> ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      manifest[slug] = { remoteUrl: url, local: null, failed: String(err) };
      console.log(`  FAIL ${slug}: ${err}`);
    }
  }

  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(ROOT, MANIFEST)} (${Object.keys(manifest).length} entries).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});