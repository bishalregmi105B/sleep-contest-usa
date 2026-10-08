#!/usr/bin/env node
/**
 * Downloads the three webfonts this site uses into src/app/fonts/.
 *
 * next/font/google fetches from fonts.googleapis.com during the build, which
 * makes every deployment depend on a third party being reachable from the build
 * machine. When Vercel's container got a response Turbopack could not parse, the
 * deploy failed with "next/font/google queries have exactly one entry".
 *
 * Self-hosting removes the network call from the build entirely. next/font/local
 * still self-hosts, preloads and generates the size-adjusted fallback, so the
 * rendering is unchanged; only the source of the bytes moves into the repo.
 *
 * The .woff2 files are committed. Re-run this only to pick up a new upstream
 * version of a family.
 *
 * Usage: node scripts/fetch-fonts.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/app/fonts');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

// Google only serves woff2 to browser user agents.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';

/**
 * Only the latin subset is kept. The site is US English copy, and latin covers
 * the punctuation it actually uses (middle dot, em dash, curly quotes).
 */
const SUBSET = 'latin';

const FAMILIES = [
  { slug: 'rubik', family: 'Rubik', query: 'family=Rubik:wght@300..900' },
  { slug: 'dm-sans', family: 'DM Sans', query: 'family=DM+Sans:wght@100..1000' },
  { slug: 'space-mono', family: 'Space Mono', query: 'family=Space+Mono:wght@400;700' },
];

const BLOCK = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

function field(body, name) {
  return new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body)?.[1]?.trim() ?? null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {};

  for (const { slug, family, query } of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();

    // Rubik and DM Sans come back as one variable file per subset; Space Mono is
    // genuinely static, so it yields one file per weight.
    const found = new Map();
    for (const [, subset, body] of css.matchAll(BLOCK)) {
      if (subset !== SUBSET) continue;
      const src = /src:\s*url\(([^)]+)\)/.exec(body)?.[1];
      if (!src) continue;
      found.set(src, { weight: field(body, 'font-weight'), style: field(body, 'font-style') ?? 'normal' });
    }
    if (found.size === 0) throw new Error(`no latin @font-face found for ${family}`);

    const entries = [];
    for (const [src, meta] of found) {
      const res = await fetch(src, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') {
        throw new Error(`not a woff2 file: ${src}`);
      }
      const name = found.size === 1 ? `${slug}.woff2` : `${slug}-${meta.weight}.woff2`;
      await writeFile(path.join(OUT_DIR, name), buf);
      entries.push({ src: `./fonts/${name}`, weight: meta.weight, style: meta.style, bytes: buf.length });
      console.log(`  ok   ${family} ${meta.weight} -> ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
    }

    manifest[slug] = { family, files: entries };
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${Object.keys(manifest).length} families to src/app/fonts/.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});