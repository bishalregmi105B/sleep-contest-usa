import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetDatabase } from '../helpers/db';
import { getDb } from '@/lib/db';
import { currentReserved, expireStaleHolds, markPaid, reconcile, truePaidCount } from '@/lib/capacity';
import { createRegistration } from '@/lib/registrations';

/**
 * Concurrency and correctness, against a real PostgreSQL.
 *
 * Each test here corresponds to a guarantee the project claims. They are not
 * "does the function return" tests: they fire many concurrent writers at the
 * real database and assert the invariants afterwards, which is the only way to
 * know whether the invariants hold.
 */

const CAP = 10_000;

function payload(email: string) {
  return {
    fullName: 'Concurrency Tester',
    email,
    mobile: '5125550134',
    dateOfBirth: '1990-01-01',
    cityState: 'Dallas, TX',
    ipHash: 'testhash',
  };
}

beforeAll(resetDatabase);
afterAll(resetDatabase);

describe('duplicate registration under concurrency', () => {
  it('100 parallel submissions with the same email produce exactly one active row', async () => {
    await resetDatabase();
    const email = 'dupe@example.com';

    const results = await Promise.all(
      Array.from({ length: 100 }, () => createRegistration(payload(email), CAP)),
    );

    const db = await getDb();
    const rows = await db.registration.findMany({ where: { emailNormalized: email } });
    expect(rows).toHaveLength(1);

    // Every response names the same registration, or the handful that lost the
    // race report a clean duplicate. Nothing is lost.
    const ids = new Set(results.filter((r) => r.ok).map((r) => (r as { publicId: string }).publicId));
    expect(ids.size).toBe(1);
    expect(results.every((r) => r.ok || (r as { reason: string }).reason === 'duplicate')).toBe(true);

    // Capacity was claimed exactly once, not 100 times.
    expect(await currentReserved()).toBe(1);
  });
});

describe('capacity enforcement under concurrency', () => {
  it('1,000 parallel registrations against a cap of 100 grant exactly 100 holds', async () => {
    await resetDatabase();
    const CAPACITY = 100;

    const results = await Promise.all(
      Array.from({ length: 1_000 }, (_, i) => createRegistration(payload(`cap${i}@example.com`), CAPACITY)),
    );

    const granted = results.filter((r) => r.ok).length;
    const refused = results.filter((r) => !r.ok && (r as { reason: string }).reason === 'full').length;

    expect(granted).toBe(100);
    expect(refused).toBe(900);
    expect(granted + refused).toBe(1_000);

    // The cap was never exceeded, at any point, by any writer.
    const reserved = await currentReserved();
    expect(reserved).toBe(100);
    expect(reserved).toBeLessThanOrEqual(CAPACITY);

    const db = await getDb();
    expect(await db.registration.count()).toBe(100);
  });
});

describe('mat numbers under concurrency', () => {
  it('1,000 parallel paid transitions produce no duplicate mat numbers', async () => {
    await resetDatabase();

    const created = await Promise.all(
      Array.from({ length: 1_000 }, (_, i) => createRegistration(payload(`mat${i}@example.com`), CAP)),
    );
    const publicIds = created.map((r) => (r as { publicId: string }).publicId);

    // Fire every transition at once. This is the case the previous
    // read-MAX-then-increment implementation lost: many transactions reading
    // the same maximum and colliding on the unique index.
    await Promise.all(publicIds.map((id) => markPaid(id, { provider: 'stripe', ref: `pi_${id}` })));

    const db = await getDb();
    const rows = await db.registration.findMany({
      where: { status: 'paid' },
      select: { matNumber: true },
    });

    expect(rows).toHaveLength(1_000);

    const numbers = rows.map((r) => r.matNumber as number);
    expect(numbers.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
    // Uniqueness is the guarantee. Gaps are explicitly acceptable.
    expect(new Set(numbers).size).toBe(1_000);

    // The denormalised counter agrees with the truth.
    expect(await truePaidCount()).toBe(1_000);
  });

  it('a repeated transition for the same registration does not burn a second number', async () => {
    await resetDatabase();
    const created = await createRegistration(payload('once@example.com'), CAP);
    const publicId = (created as { publicId: string }).publicId;

    const first = await markPaid(publicId, { provider: 'stripe', ref: 'pi_1' });
    const second = await markPaid(publicId, { provider: 'stripe', ref: 'pi_1' });

    expect(first.processed).toBe(true);
    // Second call is a no-op, not an error: a replayed webhook is a success.
    expect(second.processed).toBe(false);
    expect(second.processed === false && second.reason).toBe('not_pending');

    const db = await getDb();
    const rows = await db.registration.findMany({ select: { matNumber: true } });
    expect(rows).toHaveLength(1);
    expect(await truePaidCount()).toBe(1);
  });
});

describe('hold expiry under concurrency', () => {
  it('two sweepers running at once release each hold exactly once', async () => {
    await resetDatabase();

    // 200 registrations whose holds have already run out.
    await Promise.all(
      Array.from({ length: 200 }, (_, i) => createRegistration(payload(`hold${i}@example.com`), CAP)),
    );
    const db = await getDb();
    await db.$executeRaw`UPDATE "Registration" SET "holdExpiresAt" = now() - interval '1 minute'`;

    expect(await currentReserved()).toBe(200);

    // Cron delivery is best effort and can fire twice. This is the case where
    // a double release would hand out capacity that is already committed.
    const [first, second] = await Promise.all([expireStaleHolds(), expireStaleHolds()]);

    expect(first.expired + second.expired).toBe(200);
    expect(await currentReserved()).toBe(0);

    // And a third pass must be a no-op.
    const third = await expireStaleHolds();
    expect(third.expired).toBe(0);
    expect(await currentReserved()).toBe(0);
  });
});

describe('counter reconciliation', () => {
  it('detects and corrects drift', async () => {
    await resetDatabase();

    await Promise.all(
      Array.from({ length: 10 }, (_, i) => createRegistration(payload(`rec${i}@example.com`), CAP)),
    );
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => createRegistration(payload(`recp${i}@example.com`), CAP)),
    );

    // Simulate a crash between the status transition and the counter write.
    const db = await getDb();
    await db.$executeRaw`UPDATE "Counter" SET paid = 999, reserved = 1 WHERE id = 1`;

    const result = await reconcile();
    expect(result.driftedPaid).toBe(true);
    expect(result.driftedReserved).toBe(true);
    expect(result.paid).toBe(0);
    expect(result.reserved).toBe(20);

    // Idempotent: running it again finds nothing to do.
    const second = await reconcile();
    expect(second.driftedPaid).toBe(false);
    expect(second.driftedReserved).toBe(false);
  });
});
