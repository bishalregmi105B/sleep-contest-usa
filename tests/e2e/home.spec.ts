import { expect, test } from '@playwright/test';

/**
 * Home page: loading, console cleanliness, overflow, navigation and the
 * no-WebGL fallback.
 */

test('home loads with no console errors and no failed requests', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Can you sleep through anything?',
  );

  expect(consoleErrors, 'console errors').toEqual([]);
  expect(failedRequests, 'failed requests').toEqual([]);
});

test('no horizontal overflow at any supported width', async ({ page }) => {
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    // Let the canvas settle, since it is fixed and could widen the page.
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('nav anchors scroll to their sections', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  for (const [link, section] of [
    ['How it works', 'how'],
    ['Wake-up squad', 'squad'],
    ['Prizes', 'prizes'],
  ] as const) {
    // Desktop shows the pill nav; mobile uses the menu.
    const isMobile = (page.viewportSize()?.width ?? 1440) < 1024;
    if (isMobile) {
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.getByRole('dialog').getByRole('link', { name: link }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: link }).click();
    }

    await expect
      .poll(async () => {
        const box = await page.locator(`#${section}`).boundingBox();
        return box ? Math.round(box.y) : null;
      }, { timeout: 5000 })
      .toBeLessThan(400);

    await page.waitForTimeout(400);
  }
});

test('every section is present and headings are in order', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  for (const id of [
    'hero',
    'counter',
    'how',
    'squad',
    'prizes',
    'gallery',
    'reserve',
    'faq',
    'cta',
  ]) {
    await expect(page.locator(`#${id}`), `#${id} missing`).toHaveCount(1);
  }

  // Exactly one h1 on the page.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('with WebGL disabled the page still renders and stays usable', async ({ browser }) => {
  // A context with WebGL switched off, so the tier resolves to `none`.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (typeof type === 'string' && type.includes('webgl')) return null;
      return (original as never as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as never;
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // No canvas was created, and the page is still complete and interactive.
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Can you sleep');
  await expect(page.getByTestId('reserve-form')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await context.close();
});

test('only one WebGL context exists on the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // One canvas for the whole page; no section makes its own context.
  await expect(page.locator('canvas')).toHaveCount(1);
});