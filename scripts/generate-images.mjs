#!/usr/bin/env node
/**
 * Generates the site's photographs, when a key is available.
 *
 * Without GEMINI_API_KEY this exits quietly and the site keeps its dark
 * cinematic fallback, which is the intended state when no imagery exists. That
 * matters: the fallback is a deliberate design, not a degraded one, so a
 * missing key must never be an error.
 *
 * Reads scripts/image-prompts.json, calls Google's image generation endpoint,
 * converts each result to WebP and AVIF with sharp, and writes it to the path
 * in the manifest. **Never overwrites an existing file**: a photograph that has
 * already been chosen by a human is not replaced because a script was re-run.
 *
 * Generated images are AI output and the site labels them "Concept visual".
 * They need a human review before launch — check faces, hands, any accidental
 * text or logo in frame, and that each image matches its caption.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/generate-images.mjs            # everything
 *   GEMINI_API_KEY=... node scripts/generate-images.mjs cine/k1 k2  # a subset
 */

import { readFile, mkdir, access, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'scripts/image-prompts.json');

/** Generous: a single 2400px image takes a while, and rate limits are real. */
const TIMEOUT_MS = 180_000;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the current image model id from Google's models endpoint rather than
 * hardcoding one, because these ids move between releases and a stale id fails
 * at the first real call rather than at install time.
 */
async function resolveModel(apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) throw new Error(`models list failed: HTTP ${res.status}`);

  const body = await res.json();
  const candidates = (body.models ?? [])
    .filter((m) => Array.isArray(m.supportedGenerationMethods))
    .filter((m) => m.supportedGenerationMethods.includes('generateContent'))
    // Prefer the image-capable models, newest naming first.
    .filter((m) => /imagen|gemini.*image/i.test(m.name))
    .map((m) => m.name.replace(/^models\//, ''));

  return candidates[0] ?? null;
}

async function generate(apiKey, model, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const body = await res.json();
    const parts = body?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((part) => part.inlineData?.data);
    if (!inline) throw new Error('no image data in response');

    return Buffer.from(inline.inlineData.data, 'base64');
  } finally {
    clearTimeout(timer);
  }
}

async function writeVariants(buffer, outPath, width, height) {
  const dir = path.dirname(outPath);
  await mkdir(dir, { recursive: true });

  const base = sharp(buffer).resize(width, height, { fit: 'cover', position: 'attention' });

  const webp = path.join(dir, `${path.basename(outPath, path.extname(outPath))}.webp`);
  await base.clone().webp({ quality: 78 }).toFile(webp);

  // AVIF costs several seconds per frame at this size, so it is best-effort.
  try {
    const avif = path.join(dir, `${path.basename(outPath, path.extname(outPath))}.avif`);
    await base.clone().avif({ quality: 58, effort: 4 }).toFile(avif);
  } catch (err) {
    console.warn(`    avif skipped: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return webp;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.log('generate-images: no GEMINI_API_KEY, skipping.');
    console.log('  The site keeps its dark cinematic fallback, which is a valid state.');
    console.log('  See ASSETS_TO_GENERATE.md for the prompt and path of each file.');
    return;
  }

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const wanted = process.argv.slice(2);
  const targets = wanted.length
    ? manifest.images.filter((image) => wanted.some((w) => image.key.includes(w)))
    : manifest.images;

  if (targets.length === 0) {
    console.error('No matching images. Keys available:');
    for (const image of manifest.images) console.error(`  ${image.key}`);
    process.exitCode = 1;
    return;
  }

  const model = await resolveModel(apiKey);
  if (!model) {
    console.error('No image-capable model found for this key.');
    process.exitCode = 1;
    return;
  }
  console.log(`generate-images: model ${model}, ${targets.length} image(s)\n`);

  let written = 0;
  let skipped = 0;

  for (const image of targets) {
    const outPath = path.join(ROOT, image.path);

    if (await exists(outPath)) {
      console.log(`  skip ${image.key} (already exists)`);
      skipped += 1;
      continue;
    }

    const prompt = `${manifest.styleLock} ${image.prompt}`;
    process.stdout.write(`  gen  ${image.key} ... `);

    try {
      const buffer = await generate(apiKey, model, prompt);
      const webp = await writeVariants(buffer, outPath, image.width, image.height);
      const { size } = await stat(webp);
      console.log(`${(size / 1024).toFixed(0)} KB -> ${path.relative(ROOT, webp)}`);
      written += 1;
    } catch (err) {
      console.log(`failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  console.log(`\n${written} written, ${skipped} skipped.`);
  if (written > 0) {
    console.log('Review every image by eye before launch: faces, hands, stray text,');
    console.log('and that each one actually matches its caption.');
    console.log('Then run `npm run assets:scan` (or just build) to pick them up.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});