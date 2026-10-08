import { expect, test } from '@playwright/test';

/** API shape, the counter matching the database, and the admin gate. */

test('GET /api/stats returns the documented shape', async ({ request }) => {
  const response = await request.get('/api/stats');
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { count: number; goal: number };
  expect(typeof body.count).toBe('number');
  expect(body.goal).toBe(200_000);
  expect(body.count).toBeGreaterThanOrEqual(0);
  expect(body.count).toBeLessThanOrEqual(body.goal);
});

test('the counter on the page matches the database count', async ({ page, request }) => {
  const { count } = (await (await request.get('/api/stats')).json()) as { count: number };

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('counter-value')).toHaveText(
    count.toLocaleString('en-US'),
    { timeout: 10_000 },
  );
});

test('registration rejects an under-18 date of birth server side', async ({ request }) => {
  const response = await request.post('/api/register', {
    data: {
      fullName: 'Too Young',
      email: `minor-${Date.now()}@example.com`,
      mobile: '5551234567',
      dateOfBirth: '2015-05-05',
      cityState: 'Dallas, TX',
      consent: true,
    },
  });

  expect(response.status()).toBe(400);
  const body = (await response.json()) as { fields?: Record<string, string> };
  expect(body.fields?.dateOfBirth).toMatch(/18 or older/i);
});

test('the honeypot field is refused', async ({ request }) => {
  const response = await request.post('/api/register', {
    data: {
      fullName: 'Robot Bot',
      email: `bot-${Date.now()}@example.com`,
      mobile: '5551234567',
      dateOfBirth: '1990-05-05',
      cityState: 'Dallas, TX',
      consent: true,
      company: 'spam-co',
    },
  });

  expect(response.status()).toBe(400);
});

test('admin is gated and the export refuses an unauthenticated request', async ({
  page,
  request,
}) => {
  await page.goto('/admin');

  // The gate renders instead of the registrations table.
  await expect(page.getByTestId('admin-submit')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);

  const csv = await request.get('/api/admin/export');
  expect(csv.status()).toBe(401);
});

test('admin sign-in with the right password reveals the table', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel(/password/i).fill('test-password');
  await page.getByTestId('admin-submit').click();

  await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });
});

test('admin rejects a wrong password', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel(/password/i).fill('definitely-wrong');
  await page.getByTestId('admin-submit').click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('a ticket id that does not exist returns 404', async ({ page }) => {
  const response = await page.goto('/ticket/doesnotexistatall');
  expect(response?.status()).toBe(404);
});