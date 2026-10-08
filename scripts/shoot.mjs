import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = 'demo/screenshots';
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
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await el.screenshot({ path: `${OUT}/${vp.name}-${id}.png` }).catch(async () => {
      await page.screenshot({ path: `${OUT}/${vp.name}-${id}.png` });
    });
  }

  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });
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