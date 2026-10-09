#!/usr/bin/env node
/**
 * Cross-browser smoke test.
 *
 * Checks the three engines that behave differently in ways this site depends
 * on: WebGL support, `svh` units, `mix-blend-mode`, the Web Share API and
 * `position: sticky`. For each engine, loads every page, walks the whole page
 * and registers end to end.
 *
 * A browser whose system libraries are missing on this machine is reported as
 * "skipped", never as "passed": a silent skip would be worse than a gap.
 *
 * Usage: node scripts/smoke.mjs
 */

import { chromium, firefox, webkit } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const ENGINES = [
  { name: 'chromium', type: chromium },
  { name: 'firefox', type: firefox },
  { name: 'webkit', type: webkit },
];

const PAGES = ['/', '/rules', '/refund', '/privacy', '/friends'];

let failed = 0;
const lines = [];

function line(status, engine, message) {
  lines.push(`${status}  ${engine.padEnd(9)} ${message}`);
  if (status === 'FAIL') failed += 1;
}

for (const engine of ENGINES) {
  let browser;
  try {
    browser = await engine.type.launch();
  } catch (err) {
    line('SKIP', engine.name, `could not launch: ${(err?.message ?? '').split('\n')[0]}`);
    continue;
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const failures = [];
    page.on('pageerror', (err) => failures.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
    });

    for (const route of PAGES) {
      failures.length = 0;
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1200);

      line(
        failures.length === 0 ? 'pass' : 'FAIL',
        engine.name,
        `${route} loads cleanly${failures.length ? ` — ${failures.slice(0, 2).join(' | ')}` : ''}`,
      );
    }

    // Walk the whole page: sticky headers, sticky facts bar, scroll-linked sky.
    failures.length = 0;
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    line(
      failures.length === 0 ? 'pass' : 'FAIL',
      engine.name,
      `full-page scroll is clean${failures.length ? ` — ${failures.slice(0, 2).join(' | ')}` : ''}`,
    );

    // Register end to end. This is the flow that must work everywhere.
    failures.length = 0;
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#reserve').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    const suffix = `${engine.name.slice(0, 3)}-${Date.now()}`;
    await page.getByLabel('Full name').fill(`Smoke ${engine.name.slice(0, 3)}`);
    await page.getByLabel('Email').fill(`smoke-${suffix}@example.com`);
    await page.getByLabel('Mobile').fill('5125550142');
    await page.getByLabel('Date of birth').fill('1990-04-12');
    await page.getByLabel('City and state').fill('Dallas, TX');
    await page.getByRole('checkbox').check();
    await page.getByTestId('reserve-submit').click();

    let registered = false;
    try {
      await page.waitForURL(/\/ticket\//, { timeout: 25000 });
      await page.waitForSelector('[data-testid="mat-number"]', { timeout: 15000 });
      registered = true;
    } catch {
      registered = false;
    }

    line(
      registered ? 'pass' : 'FAIL',
      engine.name,
      'registration completes and reaches a ticket',
    );

    // Reduced motion must be honoured, not merely tolerated.
    const reduced = await context.newPage();
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(BASE, { waitUntil: 'networkidle' });
    await reduced.waitForTimeout(1000);
    const preloader = await reduced
      .locator('.lights-down')
      .evaluate((el) => getComputedStyle(el).visibility);
    line(
      preloader === 'hidden' ? 'pass' : 'FAIL',
      engine.name,
      `reduced motion hides the preloader (got ${preloader})`,
    );
    await reduced.close();

    await context.close();
  } catch (err) {
    line('FAIL', engine.name, `unexpected: ${(err?.message ?? '').split('\n')[0]}`);
  } finally {
    await browser.close();
  }
}

console.log(lines.join('\n'));
const skipped = lines.filter((l) => l.startsWith('SKIP')).length;
console.log(
  `\n${lines.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped.`,
);
process.exitCode = failed ? 1 : 0;