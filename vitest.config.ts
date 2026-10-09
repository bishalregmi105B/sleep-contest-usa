import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Test environment.
 *
 * Integration tests run against a **real** PostgreSQL and a **real** Redis.
 * That is deliberate: every correctness property this project claims — atomic
 * holds, exactly-once webhooks, unique mat numbers, a sliding-window rate
 * limiter — is a property of the database and the cache, not of the TypeScript.
 * A test double would assert only that the code calls the double, which is the
 * failure mode the brief warns about: "structural checks pass while the flow is
 * broken".
 *
 * The database is separate from the development one and is truncated between
 * suites. Files run sequentially because they share it.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://sc:scpass@127.0.0.1:55432/sleepcontest_test?connection_limit=50';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:56379';

// Set before any application module is imported. `src/lib/env.ts` snapshots
// process.env at module load, so these have to be in place first.
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;
process.env.REDIS_URL = TEST_REDIS_URL;
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
process.env.ADMIN_PASSWORD_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$PLACEHOLDER';
process.env.CRON_SECRET = 'test-cron-secret-at-least-24-chars';
process.env.IP_PEPPER = 'test-ip-pepper-value-1234';
process.env.MOCK_PAYMENTS = 'true';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
  },
});
