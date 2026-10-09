import { getDb } from '@/lib/db';

/**
 * Resets database state between suites.
 *
 * TRUNCATE with CASCADE and RESTART IDENTITY rather than DELETE: it is a single
 * fast operation, and resetting identity matters here because the mat-number
 * sequence and the counter row must start from a known state or assertions
 * about uniqueness and drift detection are meaningless.
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Registration", "WebhookEvent", "EmailOutbox", "IdempotencyRecord",
      "WaitlistEntry", "SettingAudit", "Setting"
    RESTART IDENTITY CASCADE
  `);
  // The capacity ledger is a single row, so TRUNCATE cannot be used on it
  // without taking everything with it.
  await db.$executeRaw`UPDATE "Counter" SET reserved = 0, paid = 0 WHERE id = 1`;
  await db.$executeRaw`SELECT setval('mat_number_seq', 1, false)`;
}

/** Clears Redis keys created by the suite. */
export async function resetRedis(kv: { del(key: string): Promise<void> }): Promise<void> {
  const keys = [
    'settings:v1',
    'settings:public:v1',
    'stats:v1',
    'lock:stats:v1',
  ];
  for (const key of keys) await kv.del(key).catch(() => undefined);
}
