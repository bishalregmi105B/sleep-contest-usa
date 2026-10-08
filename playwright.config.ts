import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * E2E configuration.
 *
 * Runs against a production build rather than the dev server, so what is tested
 * is what would ship. The database is a throwaway SQLite file seeded per run,
 * so a test registration never touches a developer's real data.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // A dedicated test password and secret, never the developer's.
      ADMIN_PASSWORD: 'test-password',
      SESSION_SECRET: 'test-secret-value-long-enough-to-sign',
      SEED_DEMO: 'false',
    },
  },
});