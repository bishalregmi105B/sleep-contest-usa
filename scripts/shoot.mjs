import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

/**
 * Screenshots every section at 1440 and 390 px.
 *
 * Usage: node scripts/shoot.mjs [outputDir]
 *   defaults to demo/screenshots; pass demo/before or demo/after to capture
 *   the two sides of a comparison.
 */
const OUT = process.argv[2] ?? 'demo/screenshots';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const SECTIONS = [
  'hero',
  'counter',
  'how',
  'squad',
  'prizes',
  'gallery',
  'reserve',
  'faq',
  'cta',
];

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

const errors = [];

await mkdir(OUT, { recursive: true });
console.log(`shooting ${BASE} -> ${OUT}`);

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${vp.name}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${vp.name}] pageerror: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`[${vp.name}] ${res.status()} ${res.url()}`);
  });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  // Let the idle-scheduled canvas and the preloader settle.
  await page.waitForTimeout(2500);

  for (const id of SECTIONS) {
    const el = page.locator(`#${id}`);
    if ((await el.count()) === 0) {
      errors.push(`[${vp.name}] missing section #${id}`);
      continue;
    }

    // Grow the viewport so the whole section fits, scroll it to the top, then
    // take a normal element screenshot. Element screenshots of a section taller
    // than the viewport scroll the page and return an unpainted band; a
    // fullPage clip is worse, because fixed and sticky layers re-render at the
    // top of the document instead of where the visitor sees them.
    const box = await el.boundingBox();
    const needed = Math.min(2400, Math.ceil((box?.height ?? 0) + 80));
    if (needed > vp.height) {
      await page.setViewportSize({ width: vp.width, height: needed });
      await page.waitForTimeout(400);
    }

    await page.evaluate((sectionId) => {
      const node = document.getElementById(sectionId);
      if (node) window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }, id);

    // The sky, the sticky header and the film grain are all driven by scroll
    // position, and resizing the viewport invalidates that. Wait until the
    // page agrees the section is active before capturing, or the screenshot
    // shows one section's copy over the previous section's sky.
    await page
      .waitForFunction(
        (sectionId) => document.documentElement.dataset.section === sectionId,
        id,
        { timeout: 8000 },
      )
      .catch(() => errors.push(`[${vp.name}] ${id} never became the active section`));
    await page.waitForTimeout(900);

    await el.screenshot({ path: `${OUT}/${vp.name}-${id}.jpg`, type: 'jpeg', quality: 78 }).catch(async () => {
      await page.screenshot({ path: `${OUT}/${vp.name}-${id}.jpg`, type: 'jpeg', quality: 78 });
    });

    if (needed > vp.height) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);
    }
  }

  await page.screenshot({ path: `${OUT}/${vp.name}-full.jpg`, type: 'jpeg', quality: 70, fullPage: true });
  await context.close();
}

await browser.close();

if (errors.length) {
  console.log(`\n${errors.length} issue(s):`);
  for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e);
  process.exitCode = 1;
} else {
  console.log('No console errors, page errors or failed requests.');
}