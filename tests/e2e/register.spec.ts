import { expect, test } from '@playwright/test';

/**
 * Registration flow: validation, the 18+ rule, consent, a successful mock
 * payment, the duplicate guard, and keyboard-only completion.
 */

const ADULT_DOB = '1990-05-05';
const CHILD_DOB = '2015-05-05';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#reserve').scrollIntoViewIfNeeded();
});

test('empty submission shows a validation summary and no request is sent', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/register')) requests.push(request.url());
  });

  await page.getByTestId('reserve-submit').click();
  await expect(page.getByTestId('form-errors')).toBeVisible();
  expect(requests).toHaveLength(0);
});

test('an under-18 date of birth is rejected', async ({ page }) => {
  await page.getByLabel(/full name/i).fill('Young Sleeper');
  await page.getByLabel(/^email/i).fill(uniqueEmail('minor'));
  await page.getByLabel(/mobile/i).fill('5551234567');
  await page.getByLabel(/date of birth/i).fill(CHILD_DOB);
  await page.getByLabel(/city and state/i).fill('Dallas, TX');
  await page.getByRole('checkbox').check();

  await page.getByTestId('reserve-submit').click();

  await expect(page.getByText(/must be 18 or older/i).first()).toBeVisible();
});

test('consent must be given', async ({ page }) => {
  await page.getByLabel(/full name/i).fill('No Consent');
  await page.getByLabel(/^email/i).fill(uniqueEmail('noconsent'));
  await page.getByLabel(/mobile/i).fill('5551234567');
  await page.getByLabel(/date of birth/i).fill(ADULT_DOB);
  await page.getByLabel(/city and state/i).fill('Dallas, TX');
  // Consent deliberately left unchecked.

  await page.getByTestId('reserve-submit').click();

  await expect(page.getByText(/18 or older and agree/i).first()).toBeVisible();
});

test('a valid registration completes and lands on the ticket', async ({ page }) => {
  const email = uniqueEmail('happy');

  await page.getByLabel(/full name/i).fill('Ada Asleep');
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/mobile/i).fill('5551234567');
  await page.getByLabel(/date of birth/i).fill(ADULT_DOB);
  await page.getByLabel(/city and state/i).fill('Dallas, TX');
  await page.getByRole('checkbox').check();

  await page.getByTestId('reserve-submit').click();

  // The mock provider completes instantly and redirects to the ticket.
  await page.waitForURL(/\/ticket\/[a-z0-9]+/, { timeout: 20_000 });

  await expect(page.getByTestId('ticket')).toBeVisible();
  await expect(page.getByTestId('mat-number')).toContainText('#');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ada');

  // A ticket URL must not expose a sequential id.
  const publicId = page.url().split('/ticket/')[1]!;
  expect(publicId).not.toMatch(/^\d+$/);
});

test('a second registration with the same paid email shows the friendly error', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('dupe');

  const body = {
    fullName: 'Bo Dozer',
    email,
    mobile: '5551234567',
    dateOfBirth: ADULT_DOB,
    cityState: 'Dallas, TX',
    consent: true,
    ref: '',
    company: '',
  };

  const first = await request.post('/api/register', { data: body });
  expect(first.ok()).toBeTruthy();
  const { publicId } = (await first.json()) as { publicId: string };

  const paid = await request.post('/api/checkout', { data: { publicId } });
  expect(paid.ok()).toBeTruthy();

  // Now the same email tries again through the form.
  await page.getByLabel(/full name/i).fill('Bo Dozer');
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/mobile/i).fill('5551234567');
  await page.getByLabel(/date of birth/i).fill(ADULT_DOB);
  await page.getByLabel(/city and state/i).fill('Dallas, TX');
  await page.getByRole('checkbox').check();
  await page.getByTestId('reserve-submit').click();

  await expect(page.getByText(/already registered and paid/i).first()).toBeVisible();
});

test('the form can be completed with the keyboard alone', async ({ page }) => {
  const email = uniqueEmail('keyboard');

  const fullName = page.getByLabel(/full name/i);
  await fullName.focus();

  // Tab order through the form, typing as we go.
  await page.keyboard.type('Keyboard Napper');
  await page.keyboard.press('Tab');
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type('5551234567');
  await page.keyboard.press('Tab');
  await page.keyboard.type(ADULT_DOB);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Dallas, TX');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space'); // consent checkbox

  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await page.waitForURL(/\/ticket\/[a-z0-9]+/, { timeout: 20_000 });
  await expect(page.getByTestId('ticket')).toBeVisible();
});