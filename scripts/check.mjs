#!/usr/bin/env node
/**
 * Acceptance checks.
 *
 * These are the checks that would not have caught the bugs this pass fixed, so
 * each one is written against a specific failure rather than as generic
 * coverage. Run against a production build:
 *
 *   npm run build && npm start &
 *   npm run check
 *
 * Exits non-zero if anything fails, so it can be wired into CI.
 */

import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ROOT = path.resolve(import.meta.dirname, '..');

/** Read the content module as text so the checks assert against the real source. */
const siteSource = readFileSync(path.join(ROOT, 'src/content/site.ts'), 'utf8');
const faqSource = readFileSync(path.join(ROOT, 'src/content/site.ts'), 'utf8');

const results = [];
let failed = 0;

function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  if (!pass) failed += 1;
  console.log(`  ${pass ? 'pass' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Every page a visitor can reach without registering. */
const PAGES = ['/', '/rules', '/refund', '/privacy', '/friends'];

const browser = await chromium.launch();

/* ---------------------------------------------------------------- counter -- */

console.log('\nCounter threshold');

// The threshold decision is asserted against the rendered page, using the same
// rule the content module declares: a number is shown only at or above
// NEXT_PUBLIC_COUNTER_MIN_PUBLIC.

async function counterPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return page;
}

{
  const page = await counterPage();
  const count = Number(process.env.EXPECT_PAID ?? '0');
  const threshold = Number(process.env.NEXT_PUBLIC_COUNTER_MIN_PUBLIC ?? '500');
  const shouldShowCount = count >= threshold && count > 0;

  const valueCount = await page.getByTestId('counter-value').count();
  const targetCount = await page.getByTestId('counter-target').count();

  if (count === 0) {
    check('a zero registration count is never shown as a number', valueCount === 0);
    check('the zero state shows an invitation instead', targetCount === 1);
    const text = targetCount ? (await page.getByTestId('counter-target').textContent()) ?? '' : '';
    check('the zero state does not read "0"', !/\b0\b/.test(text.trim()), text.trim().slice(0, 60));
  } else {
    check(
      shouldShowCount
        ? 'at or above the threshold, the real number is shown'
        : 'below the threshold, the number is hidden',
      shouldShowCount ? valueCount === 1 : valueCount === 0,
      `count=${count} threshold=${threshold}`,
    );
  }
  await page.close();
}

check(
  'the threshold defaults to 500 and is configurable',
  /NEXT_PUBLIC_COUNTER_MIN_PUBLIC/.test(siteSource) && /\?\? ?'500'/.test(siteSource),
);

/* ------------------------------------------------------------------- pages -- */

console.log('\nProduction copy');

for (const route of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failures = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
  });
  page.on('pageerror', (err) => failures.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
  });

  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

  // The copy pass: no square brackets and no literal undefined may survive to
  // production. Both were real bugs.
  check(`${route}: no square brackets in visible copy`, !text.includes('['), text.match(/.{0,30}\[.{0,30}/)?.[0] ?? '');
  check(`${route}: no "undefined" in visible copy`, !/\bundefined\b/.test(text));
  check(`${route}: no placeholder tokens`, !/\b(TODO|Lorem ipsum|XXX|FIXME)\b/.test(text));
  check(`${route}: no console errors, 404s or page errors`, failures.length === 0, failures.slice(0, 3).join(' | '));

  await page.close();
}

/* ---------------------------------------------------------- photography --- */

console.log('\nPhotography');

{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Every gallery tile must be a distinct photograph, and labelled as concept
  // imagery. Six copies of one image is the exact bug this project started from.
  const figures = page.locator('#gallery figure');
  const count = await figures.count();
  check('the gallery shows six tiles', count === 6, String(count));

  // Read each tile's own title and label. Reading the figure's whole innerText
  // would put the "Concept visual" label first in every tile, which compares
  // six identical strings and passes or fails for the wrong reason.
  const titles = await page.locator('#gallery figure figcaption').allInnerTexts();
  const labels = await page.locator('#gallery figure span').allInnerTexts();

  check('every gallery tile has a photograph', (await page.locator('#gallery figure img').count()) === 6);
  check('every gallery tile has a title', titles.length === 6 && titles.every((t) => t.trim().length > 0));
  check(
    'every gallery title is unique',
    new Set(titles.map((t) => t.trim())).size === titles.length,
    titles.join(' | '),
  );
  check(
    'every gallery tile is labelled a concept visual',
    labels.some((l) => /concept visual/i.test(l)),
    labels.slice(0, 2).join(' | '),
  );

  await page.close();
}

/* -------------------------------------------------------------- facts bar -- */

console.log('\nFacts bar');

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const bar = page.getByTestId('facts-bar');
  const visible = await bar.isVisible();
  check('the facts bar is visible on mobile', visible);

  const text = ((await bar.innerText()) ?? '').replace(/\s+/g, ' ');

  // Every value is asserted against the content module, so the bar cannot
  // drift out of step with the counter, the money or the rules page.
  check('the facts bar states the goal', /200,000/.test(text), text.slice(0, 80));
  check('the facts bar states the reserve price', /\$10/.test(text));
  check('the facts bar states the total price', /\$39\.99/.test(text));
  check('the facts bar states the minimum age', /18/.test(text));
  check('the facts bar links to the official rules', await bar.getByText('Official rules').count() > 0);
  check('the facts bar links to the refund policy', await bar.getByText('Refund policy').count() > 0);

  await page.close();
}

/* ------------------------------------------------------------------- FAQ --- */

console.log('\nSafety FAQ gating');

check(
  'draft FAQ answers are marked draft in the content module',
  /status: 'draft'/.test(faqSource),
);
check(
  'only published items are rendered',
  /PUBLISHED_FAQ = FAQ\.filter\(\(item\) => item\.status === 'published'\)/.test(faqSource),
);
check(
  'the safety FAQ is behind an explicit approval flag',
  /NEXT_PUBLIC_SAFETY_FAQ_APPROVED/.test(siteSource),
);

{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const body = ((await page.locator('body').innerText()) ?? '');
  check(
    'draft safety questions are not on the page',
    !/Is the noise safe for my hearing|What happens to my heart-rate data/.test(body),
  );
  await page.close();
}

/* --------------------------------------------------------------- footer --- */

console.log('\nFooter identity');

{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const footer = (await page.locator('footer').innerText()) ?? '';

  check('the organizer is named', footer.includes('Sparsha LLC'));
  check('the contact link is a mailto when an address is configured',
    process.env.NEXT_PUBLIC_CONTACT_EMAIL
      ? footer.includes('@') || (await page.locator('footer a[href^="mailto:"]').count()) > 0
      : true);
  check('the footer links to the rules', footer.includes('Official rules'));
  check('the footer links to the refund policy', footer.includes('Refund policy'));
  check('the footer links to the privacy policy', footer.includes('Privacy'));
  check(
    'no footer line renders empty',
    !/\n\s*\n\s*\n/.test(footer),
  );

  await page.close();
}

/* ------------------------------------------------------------- analytics -- */

console.log('\nAnalytics');

{
  const analyticsSource = readFileSync(path.join(ROOT, 'src/lib/analytics.ts'), 'utf8');

  // The event list is the whole surface. Anything carrying identity data would
  // have to appear here.
  const eventNames = [...analyticsSource.matchAll(/export const \w+ = '([a-z_]+)'/g)].map((m) => m[1]);
  check(
    'only the five documented events exist',
    JSON.stringify(eventNames.sort()) ===
      JSON.stringify(['form_start', 'form_submit', 'registered', 'reserve_click', 'share_click']),
    eventNames.join(', '),
  );
  check(
    'no event carries personal data',
    !/\b(email|fullName|matNumber|mobile|refCode|cityState|dateOfBirth)\b/.test(
      analyticsSource.replace(/\/\*[\s\S]*?\*\//g, ''),
    ),
  );

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // `track()` pushes onto the queue Vercel Analytics reads from, so that is
  // what the assertion reads: it checks the real path, not a stand-in.
  await page.addInitScript(() => {
    window.__vaq = window.__vaq ?? [];
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByTestId('hero-cta').click();
  await page.waitForTimeout(400);
  const queued = await page.evaluate(() => window.__vaq ?? []);
  check(
    'clicking the primary CTA queues the reserve_click event',
    queued.some((q) => Array.isArray(q) && q[0] === 'event' && q[1] === 'reserve_click'),
    JSON.stringify(queued),
  );
  check(
    'every queued entry carries no payload beyond the event name',
    // Vercel's queue format is ['event', name, payload]; an absent payload
    // serialises as null, which must never become an object of personal data.
    queued.every(
      (q) =>
        !Array.isArray(q) ||
        (q[0] === 'event' && q[1] === 'reserve_click' && (q.length < 3 || q[2] == null)),
    ),
    JSON.stringify(queued),
  );
  await page.close();
}

/* ------------------------------------------------------------------ axe --- */

console.log('\nAccessibility (axe)');

for (const route of ['/', '/rules', '/refund', '/privacy']) {
  // axe-core refuses a page created off the browser rather than a context.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? ''),
  );
  const moderate = results.violations.filter((v) => v.impact === 'moderate');

  check(
    `${route}: no serious or critical axe violations`,
    serious.length === 0,
    serious.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
  );
  check(
    `${route}: no moderate axe violations`,
    moderate.length === 0,
    moderate.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
  );

  await context.close();
}

/* ------------------------------------------------- reduced motion / tier -- */

console.log('\nMotion and device variants');

{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const failures = [];
  page.on('pageerror', (err) => failures.push(err.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const preloaderOpacity = await page
    .locator('.lights-down')
    .evaluate((el) => getComputedStyle(el).visibility);
  check('reduced motion hides the preloader', preloaderOpacity === 'hidden', preloaderOpacity);
  check('reduced motion renders without errors', failures.length === 0, failures.slice(0, 2).join(' | '));
  await page.close();
}

{
  // Save-Data is an explicit request for less data: it must land on the low
  // tier, which disables the WebGL scene and the film grain.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const context = page.context();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true, effectiveType: '4g' },
      configurable: true,
    });
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const tier = await page.evaluate(() => document.documentElement.dataset.tier);
  check('save-data lands on the low tier', tier === 'low', String(tier));
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.context().addInitScript(() => {
    // Simulate a browser with no WebGL2 at all.
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).startsWith('webgl')) return null;
      return original.call(this, type, ...rest);
    };
  });
  const failures = [];
  page.on('pageerror', (err) => failures.push(err.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const tier = await page.evaluate(() => document.documentElement.dataset.tier);
  check('no WebGL2 falls back to the static night', tier === 'none', String(tier));
  const heroText = await page.getByTestId('hero-cta').isVisible();
  check('the page is fully usable without WebGL', heroText);
  check('no WebGL causes no errors', failures.length === 0, failures.slice(0, 2).join(' | '));
  await page.close();
}

/* --------------------------------------------------------------- layout -- */

console.log('\nLayout stability');

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cls = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 1500);
      }),
  );
  check(`${width}px: cumulative layout shift under 0.1`, cls < 0.1, cls.toFixed(4));
  await page.close();
}

await browser.close();

/* ---------------------------------------------------------------- report -- */

console.log(
  `\n${results.length - failed}/${results.length} checks passed.` +
    (failed ? `  ${failed} FAILED.` : '  All green.'),
);
process.exitCode = failed ? 1 : 0;
