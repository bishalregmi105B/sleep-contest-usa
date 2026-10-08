import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility.
 *
 * axe must report zero serious or critical issues on every page, and the
 * reduced-motion and keyboard paths must work.
 */

const PAGES = ['/', '/friends', '/rules', '/refund', '/privacy', '/admin'];

test.describe('axe', () => {
  for (const path of PAGES) {
    test(`no serious or critical axe issues on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      // Let the canvas and any entrance animations settle before scanning.
      await page.waitForTimeout(1500);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === 'serious' ||
          violation.impact === 'critical',
      );

      const summary = blocking
        .map(
          (violation) =>
            `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(' '))
              .join('\n    ')}`,
        )
        .join('\n  ');

      expect(blocking, `axe violations on ${path}:\n  ${summary}`).toHaveLength(0);
    });
  }
});

test('the skip link is the first focusable element and reaches main', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip to the contest/i });
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('the FAQ accordion is keyboard operable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#faq').scrollIntoViewIfNeeded();

  const first = page.getByRole('button', { name: /when and where is it/i });
  const second = page.getByRole('button', { name: /can i get my \$10 back/i });

  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(second).toHaveAttribute('aria-expanded', 'false');

  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(first).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-expanded', 'false');
});

test('the heartbeat exposes a progressbar role with the real values', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#counter').scrollIntoViewIfNeeded();

  const bar = page.getByRole('progressbar');
  await expect(bar).toHaveAttribute('aria-valuemax', '200000');
  await expect(bar).toHaveAttribute('aria-valuenow', /\d+/);
});

test('reduced motion removes the marquee, pinning and parallax', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The ticker becomes a static line rather than an animation.
  const marqueeDuration = await page
    .locator('.ticker-track')
    .first()
    .evaluate((node) => getComputedStyle(node).animationName);
  expect(['none', '']).toContain(marqueeDuration);

  // No scroll hijacking: the page scrolls natively.
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeGreaterThan(before);

  // Content is still complete.
  await expect(page.getByTestId('reserve-form')).toBeVisible();
  await expect(page.locator('#hero h1')).toBeVisible();
});

test('focus is visible on interactive elements', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const button = page.getByTestId('hero-cta');
  await button.focus();

  const outline = await button.evaluate((node) => {
    const style = getComputedStyle(node);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });

  expect(outline.style).not.toBe('none');
  expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
});

test('every image has an alt attribute', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const missing = await page.evaluate(() =>
    Array.from(document.images)
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.currentSrc || image.src),
  );

  expect(missing).toEqual([]);
});