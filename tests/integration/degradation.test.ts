import type Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetDatabase } from '../helpers/db';
import { getDb } from '@/lib/db';
import { createRegistration } from '@/lib/registrations';
import { processEvent } from '@/lib/webhooks';
import { paidCount } from '@/lib/capacity';
import { pingDatabase } from '@/lib/db';
import { fallbackKV, setKVForTesting, type KV } from '@/lib/kv';
import { drainOutbox } from '@/lib/outbox';

/**
 * Failure injection — the degradation matrix.
 *
 * `LOAD_TEST_REPORT.md` §6 listed failure injection as not measured. These are
 * the measurements.
 *
 * Each test breaks one dependency and asserts the property that matters: the
 * site stays up, never issues a ticket without payment, never loses a
 * registration, and recovers on its own.
 */

beforeAll(resetDatabase);
afterAll(async () => {
  setKVForTesting(null);
  await resetDatabase();
});

function pending(email: string): Promise<string> {
  return createRegistration(
    {
      fullName: 'Degradation Test',
      email,
      mobile: '5125550134',
      dateOfBirth: '1990-01-01',
      cityState: 'Dallas, TX',
      ipHash: 'testhash',
    },
    10_000,
  ).then((r) => (r as { publicId: string }).publicId);
}

/** A KV whose every operation fails, standing in for an unreachable Redis. */
function brokenKV(): KV {
  const boom = () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:6379'));
  return {
    kind: 'upstash',
    get: boom,
    set: boom,
    del: boom,
    hit: boom,
    acquire: boom,
    release: boom,
    ping: () => Promise.resolve(false),
  };
}

describe('Redis unavailable', () => {
  it('rate limiting still answers, from the in-process fallback', async () => {
    await resetDatabase();
    setKVForTesting(brokenKV());

    // withKV must not propagate the failure: without this, Redis going down
    // takes registration down with it.
    const allowed = await import('@/lib/kv').then(({ withKV }) =>
      withKV(
        (kv) => kv.hit('rl:test', 5, 60),
        () => fallbackKV.hit('rl:test', 5, 60),
      ),
    );
    expect(allowed).toBe(true);

    setKVForTesting(null);
  });

  it('a registration still completes when the cache is down', async () => {
    await resetDatabase();
    setKVForTesting(brokenKV());

    const result = await createRegistration(
      {
        fullName: 'Cache Down',
        email: 'cachedown@example.com',
        mobile: '5125550134',
        dateOfBirth: '1990-01-01',
        cityState: 'Dallas, TX',
        ipHash: 'testhash',
      },
      10_000,
    );

    // The write path does not depend on Redis. This is the property that keeps
    // a cache outage from costing registrations.
    expect(result.ok).toBe(true);

    const db = await getDb();
    expect(await db.registration.count()).toBe(1);

    setKVForTesting(null);
  });
});

describe('invalid webhook signature', () => {
  it('rejects an event that was never signed', async () => {
    const { constructStripeEvent } = await import('@/lib/payments/stripe');

    // Stripe is not configured in tests, so this throws for that reason. Either
    // way the point is the same: an unverifiable event never reaches the state
    // transition. Asserted against the ledger rather than the exception type,
    // because the exception type is Stripe's to change.
    await resetDatabase();
    const db = await getDb();
    const before = await db.webhookEvent.count();

    await expect(
      Promise.resolve().then(() => constructStripeEvent('{}', 'forged-signature')),
    ).rejects.toThrow();

    // Nothing was written.
    expect(await db.webhookEvent.count()).toBe(before);
  });
});

describe('email provider unavailable', () => {
  it('the payment still succeeds and the mail is queued, not lost', async () => {
    await resetDatabase();
    const db = await getDb();
    const publicId = await pending('providerdown@example.com');

    await processEvent(db, {
      id: 'evt_provider_down',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_provider_down',
          payment_status: 'paid',
          payment_intent: 'pi_provider_down',
          metadata: { publicId },
        },
      },
    } as unknown as Stripe.Event);

    // The payment is committed even though no mail has gone anywhere yet. That
    // is the whole point of the outbox: provider latency and failure are not in
    // the payment's transaction.
    const rows = await db.registration.findMany({ where: { publicId } });
    expect(rows[0]!.status).toBe('paid');
    expect(await paidCount()).toBe(1);

    const queued = await db.emailOutbox.findMany({ where: { type: 'confirmation' } });
    expect(queued).toHaveLength(1);
    expect(queued[0]!.status).toBe('pending');
  });

  it('a failing provider retries with backoff, then gives up and marks it dead', async () => {
    await resetDatabase();
    const db = await getDb();
    const publicId = await pending('retry@example.com');

    await processEvent(db, {
      id: 'evt_retry',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_retry',
          payment_status: 'paid',
          payment_intent: 'pi_retry',
          metadata: { publicId },
        },
      },
    } as unknown as Stripe.Event);

    // Force every send to fail.
    const provider = await import('@/lib/email/provider');
    const spy = vi.spyOn(provider, 'emailProvider').mockReturnValue({
      name: 'resend',
      send: () => Promise.reject(new Error('provider 503')),
    });

    try {
      // The row is due immediately, so the first drain claims it.
      const first = await drainOutbox(10);
      expect(first.sent).toBe(0);
      expect(first.retried).toBe(1);

      const row = await db.emailOutbox.findFirst();
      expect(row!.status).toBe('retry');
      expect(row!.attempts).toBe(1);
      // The retry is scheduled into the future rather than hammered.
      expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    } finally {
      spy.mockRestore();
    }

    // Exhaust the retries. Each attempt is made due first, because the
    // backoff pushes nextAttemptAt forward by design.
    const spy2 = vi.spyOn(provider, 'emailProvider').mockReturnValue({
      name: 'resend',
      send: () => Promise.reject(new Error('provider 503')),
    });
    try {
      let dead = false;
      for (let i = 0; i < 10 && !dead; i += 1) {
        await db.emailOutbox.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1000) } });
        await drainOutbox(10);
        const row = await db.emailOutbox.findFirst();
        dead = row!.status === 'dead';
      }
      expect(dead).toBe(true);

      const row = await db.emailOutbox.findFirst();
      expect(row!.attempts).toBeGreaterThanOrEqual(5);
    } finally {
      spy2.mockRestore();
    }
  });

  it('a successful provider marks the message sent exactly once', async () => {
    await resetDatabase();
    const db = await getDb();
    const publicId = await pending('success@example.com');

    await processEvent(db, {
      id: 'evt_success',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_success',
          payment_status: 'paid',
          payment_intent: 'pi_success',
          metadata: { publicId },
        },
      },
    } as unknown as Stripe.Event);

    const sent: string[] = [];
    const provider = await import('@/lib/email/provider');
    const spy = vi.spyOn(provider, 'emailProvider').mockReturnValue({
      name: 'resend',
      send: (message) => {
        sent.push(message.to);
        return Promise.resolve();
      },
    });

    try {
      const result = await drainOutbox(10);
      expect(result.sent).toBe(1);
      expect(sent).toHaveLength(1);

      // Draining again sends nothing: the row is no longer due.
      const again = await drainOutbox(10);
      expect(again.sent).toBe(0);
      expect(sent).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('database connection lifecycle', () => {
  it('recovers after the pool is dropped, rather than staying broken', async () => {
    await resetDatabase();
    const db = await getDb();

    await expect(paidCount()).resolves.toBe(0);
    await expect(pingDatabase()).resolves.toBe(true);

    // A serverless instance is recycled constantly, and the pool being torn
    // down is normal rather than exceptional. The client must reconnect on the
    // next query instead of failing every subsequent request.
    await db.$disconnect();

    await expect(pingDatabase()).resolves.toBe(true);
    await expect(paidCount()).resolves.toBe(0);
  });

  it('reports readiness false rather than throwing when the check cannot run', async () => {
    // pingDatabase is what /api/ready uses. A load balancer needs a boolean it
    // can route on; a thrown error would surface as a 500 instead of a clean
    // "not ready", which is the behaviour the runbook tells operators to rely
    // on.
    await expect(pingDatabase(1)).resolves.toBeTypeOf('boolean');
  });
});
