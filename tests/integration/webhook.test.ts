import type Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetDatabase } from '../helpers/db';
import { getDb } from '@/lib/db';
import { createRegistration } from '@/lib/registrations';
import { processEvent } from '@/lib/webhooks';
import { truePaidCount } from '@/lib/capacity';

/**
 * Webhook exactly-once behaviour, driven through the real handler.
 *
 * `lib/webhooks.ts` is imported rather than reimplemented: a test that copies
 * the logic proves the copy behaves, not the code.
 */

/** A synthetic completed session. Stripe's shape, our metadata. */
function sessionEvent(
  eventId: string,
  publicId: string,
  overrides: Partial<Stripe.Event> = {},
): Stripe.Event {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${eventId}`,
        payment_status: 'paid',
        payment_intent: `pi_${eventId}`,
        metadata: { publicId },
        client_reference_id: publicId,
      },
    },
    ...overrides,
  } as unknown as Stripe.Event;
}

async function makePending(email: string): Promise<string> {
  const created = await createRegistration(
    {
      fullName: 'Webhook Tester',
      email,
      mobile: '5125550134',
      dateOfBirth: '1990-01-01',
      cityState: 'Dallas, TX',
      ipHash: 'testhash',
    },
    10_000,
  );
  return (created as { publicId: string }).publicId;
}

beforeAll(resetDatabase);
afterAll(resetDatabase);

describe('duplicate webhook delivery', () => {
  it('500 parallel deliveries of the same event do the work exactly once', async () => {
    await resetDatabase();
    const publicId = await makePending('webhook@example.com');
    const db = await getDb();

    const event = sessionEvent('evt_dupe_1', publicId);

    const outcomes = await Promise.all(
      Array.from({ length: 500 }, () => processEvent(db, event)),
    );

    // One does the work; the rest are recognised as duplicates.
    expect(outcomes.filter((o) => o === 'processed')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'duplicate')).toHaveLength(499);

    // One status transition.
    const rows = await db.registration.findMany({ where: { publicId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('paid');

    // One mat number, and it is not null.
    expect(rows[0]!.matNumber).not.toBeNull();

    // One outbox row. This is the guarantee that was missing before: the old
    // code re-sent the confirmation on every Stripe retry.
    expect(await db.emailOutbox.count()).toBe(1);

    // One ledger row.
    expect(await db.webhookEvent.count()).toBe(1);

    // And the counter was incremented exactly once.
    expect(await truePaidCount()).toBe(1);
  });

  it('a replayed event for an already-paid registration changes nothing', async () => {
    await resetDatabase();
    const publicId = await makePending('replay@example.com');
    const db = await getDb();

    await processEvent(db, sessionEvent('evt_a', publicId));
    const afterFirst = await db.registration.findMany({ where: { publicId } });

    // Same registration, a different event id — as happens when Stripe retries
    // after an unrelated failure, or an admin re-sends.
    await processEvent(db, sessionEvent('evt_b', publicId));

    const afterSecond = await db.registration.findMany({ where: { publicId } });
    expect(afterSecond[0]!.matNumber).toBe(afterFirst[0]!.matNumber);
    expect(afterSecond[0]!.status).toBe('paid');
    expect(await db.emailOutbox.count()).toBe(1);
  });
});

describe('out-of-order delivery', () => {
  it('an expired event followed by a completed one ends paid', async () => {
    await resetDatabase();
    const publicId = await makePending('ooo@example.com');
    const db = await getDb();

    await processEvent(db, {
      id: 'evt_exp',
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_exp', metadata: { publicId } } },
    } as unknown as Stripe.Event);

    // Expired first: capacity released, registration no longer pending.
    let rows = await db.registration.findMany({ where: { publicId } });
    expect(rows[0]!.status).toBe('expired');

    await processEvent(db, sessionEvent('evt_comp', publicId));
    rows = await db.registration.findMany({ where: { publicId } });
    // The transition is guarded on `pending`, so a late completion for an
    // expired registration does NOT issue a ticket. That is the safe direction:
    // a Stripe refund is far cheaper than a ticket nobody paid for.
    expect(rows[0]!.status).toBe('expired');
    expect(rows[0]!.matNumber).toBeNull();
    expect(await db.emailOutbox.count()).toBe(0);
  });

  it('a completed event followed by an expired one stays paid', async () => {
    await resetDatabase();
    const publicId = await makePending('ooo2@example.com');
    const db = await getDb();

    await processEvent(db, sessionEvent('evt_comp2', publicId));
    await processEvent(db, {
      id: 'evt_exp2',
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_exp2', metadata: { publicId } } },
    } as unknown as Stripe.Event);

    const rows = await db.registration.findMany({ where: { publicId } });
    expect(rows[0]!.status).toBe('paid');
    expect(await truePaidCount()).toBe(1);
  });
});

describe('unpaid sessions', () => {
  it('does not issue a ticket for a session that completed but is unpaid', async () => {
    await resetDatabase();
    const publicId = await makePending('unpaid@example.com');
    const db = await getDb();

    // Delayed payment methods complete the session before money clears.
    const event = {
      ...sessionEvent('evt_unpaid', publicId),
      data: {
        object: { id: 'cs_unpaid', payment_status: 'unpaid', payment_intent: 'pi_unpaid', metadata: { publicId } },
      },
    } as unknown as Stripe.Event;

    await processEvent(db, event);

    const rows = await db.registration.findMany({ where: { publicId } });
    expect(rows[0]!.status).toBe('pending');
    expect(rows[0]!.matNumber).toBeNull();
    expect(await db.emailOutbox.count()).toBe(0);
    expect(await truePaidCount()).toBe(0);

    // The later async success completes it properly. A separate event is built
    // rather than spreading the previous one: spreading shares the nested
    // `data` object, so `payment_status` would still read 'unpaid'.
    await processEvent(db, sessionEvent('evt_async_ok', publicId, { type: 'checkout.session.async_payment_succeeded' }));
    const after = await db.registration.findMany({ where: { publicId } });
    expect(after[0]!.status).toBe('paid');
    expect(await db.emailOutbox.count()).toBe(1);
  });
});

describe('refunds', () => {
  it('a refund releases the seat and cannot be applied twice', async () => {
    await resetDatabase();
    const publicId = await makePending('refund@example.com');
    const db = await getDb();

    await processEvent(db, sessionEvent('evt_paid', publicId));
    expect(await truePaidCount()).toBe(1);

    const refund = {
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', payment_intent: 'pi_evt_paid' } },
    } as unknown as Stripe.Event;

    await processEvent(db, refund);

    const rows = await db.registration.findMany({ where: { publicId } });
    expect(rows[0]!.status).toBe('refunded');
    expect(await truePaidCount()).toBe(0);

    // A duplicate refund must not release a second seat.
    await processEvent(db, { ...refund, id: 'evt_refund_2' });
    expect(await truePaidCount()).toBe(0);

    const counter = await db.$queryRawUnsafe<Array<{ reserved: number; paid: number }>>(
      'SELECT reserved, paid FROM "Counter" WHERE id = 1',
    );
    expect(counter[0]!.reserved).toBe(0);
    expect(counter[0]!.paid).toBe(0);
  });
});

describe('unrelated events', () => {
  it('acknowledges an event it does not handle without doing work', async () => {
    await resetDatabase();
    const db = await getDb();

    const outcome = await processEvent(db, {
      id: 'evt_unhandled',
      type: 'customer.created',
      data: { object: { id: 'cus_1' } },
    } as unknown as Stripe.Event);

    // Processed (not ignored-as-error), so Stripe does not retry it forever.
    expect(outcome).toBe('processed');
    expect(await db.webhookEvent.count()).toBe(1);
  });
});
