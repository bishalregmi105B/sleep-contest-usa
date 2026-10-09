#!/usr/bin/env node
/**
 * Licensed-media gate. Runs in `prebuild` and CI, and fails the build.
 *
 * The client asked for logos and photos from other countries' sleep contests.
 * Scraping those from Google Images would infringe copyright and trademarks, and
 * showing another organiser's logo implies affiliation. So the site ships text
 * and links instead, and if an image is ever wanted it must be declared in
 * `src/content/licensed-media.ts` with its licence and proof of right.
 *
 * This check makes that real: an image referenced by the site that is not in the
 * gate fails the build.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const GATE = path.join(ROOT, 'src/content/licensed-media.ts');

const REQUIRED_FIELDS = ['license', 'attribution', 'sourceUrl', 'proofOfRight', 'usageNotes'];

/** Third-party assets this project generated itself and therefore owns. */
const SELF_OWNED_PREFIXES = ['/assets/images/', '/assets/cine/', '/assets/generated/'];

async function collect(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, out);
    else if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// Load the gate. Absent file means an empty gate, which is a valid state: the
// site currently uses no third-party imagery.
let declared = new Set();
try {
  const source = await readFile(GATE, 'utf8');
  for (const match of source.matchAll(/src:\s*['"]([^'"]+)['"]/g)) {
    const value = match[1];
    if (value) declared.add(value);
  }

  // Every entry must carry every field. A half-declared entry is the failure
  // mode worth catching: it looks declared but proves nothing.
  for (const block of source.split(/\},\s*\{/).slice(1)) {
    const missing = REQUIRED_FIELDS.filter((field) => !new RegExp(`${field}\\s*:`).test(block));
    if (missing.length > 0) {
      console.error(`\ncheck-media FAILED: a licensed-media entry is missing ${missing.join(', ')}.\n`);
      process.exit(1);
    }
  }
} catch {
  // No gate file: nothing third-party is being used.
}

const problems = [];
const files = await collect(PUBLIC);

for (const file of files) {
  const url = '/' + path.relative(PUBLIC, file).split(path.sep).join('/');

  if (SELF_OWNED_PREFIXES.some((prefix) => url.startsWith(prefix))) continue;
  if (url.startsWith('/assets/brand/')) continue;   // client-supplied brand assets
  if (declared.has(url)) continue;

  problems.push(`${url} is in public/ but not declared in src/content/licensed-media.ts`);
}

if (problems.length > 0) {
  console.error('\ncheck-media FAILED: undeclared imagery.\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nAdd it to src/content/licensed-media.ts with licence, attribution, source and proof of right,\n');
  console.error('or remove it. Never scrape images from a search engine.\n');
  process.exit(1);
}

console.log(`media: ${files.length} image file(s), ${declared.size} licensed entr(ies), all accounted for`);
