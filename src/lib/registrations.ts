import { getDb, prismaErrorCode } from './db';
import { HOLD_MINUTES, releaseHold, takeHold } from './capacity';
import { findActiveByEmail, findByRefCode, updatePendingFields } from './repository';
import { hashEmail, hashIp, normalizeEmail, normalizeMobile } from './privacy';
import { newPublicId, newRefCode } from './ids';
import { log } from './logger';
import { siteUrl } from './env';

/**
 * The registration write path.
 *
 * This is the hot path the client modelled: bursts of 100–300 submissions per
 * second, possibly thousands of times a day. So it does the minimum — validate
 * (in the route), take a capacity hold, insert once, return.
 *
 * It deliberately does **not** send email, count registrations, or call any
 * external service. Each of those turns a 5 ms write into a several-hundred-ms
 * write and makes the endpoint fail when a third party is down.
 */

export type CreateRegistrationInput = {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  cityState: string;
  ref?: string | undefined;
  ipHash: string;
};

export type CreateRegistrationResult =
  | { readonly ok: true; readonly publicId: string; readonly existing: boolean }
  /** The cap is reached. An honest full state, not an error. */
  | { readonly ok: false; readonly reason: 'full' }
  | { readonly ok: false; readonly reason: 'duplicate' }
  | { readonly ok: false; readonly reason: 'error' };

export async function createRegistration(
  input: CreateRegistrationInput,
  maxRegistrations: number,
): Promise<CreateRegistrationResult> {
  const db = await getDb();
  const emailNormalized = normalizeEmail(input.email);
  const mobileE164 = normalizeMobile(input.mobile);

  // Fast path first. A person who retries a form, or double-clicks, gets their
  // existing registration back without taking a second hold against capacity.
  // Under 100 parallel submits with one email, this is what keeps exactly one
  // active row.
  const existing = await findActiveByEmail(emailNormalized);
  if (existing) {
    await updatePendingFields(existing.publicId, {
      fullName: input.fullName,
      mobileE164,
      cityState: input.cityState,
      dateOfBirth: new Date(input.dateOfBirth),
    }).catch(() => {
      // A paid registration is not pending and must not be edited. Returning
      // the existing row is still the right response, so this is not fatal.
    });
    return { ok: true, publicId: existing.publicId, existing: true };
  }

  // Capacity is claimed before the insert, so the check is against a number
  // that cannot change underneath us.
  const hold = await takeHold(maxRegistrations);
  if (!hold.granted) {
    log.warn('registration refused: capacity full', { reserved: hold.reserved, max: maxRegistrations });
    return { ok: false, reason: 'full' };
  }

  // Only credit a referral that resolves to a real registration.
  let referredBy: string | null = null;
  if (input.ref) {
    const referrer = await findByRefCode(input.ref).catch(() => null);
    if (referrer) referredBy = referrer.refCode;
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  // publicId and refCode are unique. A collision is a 1-in-2^80 event per
  // field, but a collision fails the whole insert, so it is retried a couple of
  // times rather than turned into a lost registration.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const inserted = await db.$queryRaw<Array<{ publicId: string }>>`
        INSERT INTO "Registration" (
          "publicId", "fullName", "email", "emailNormalized", "mobileE164",
          "dateOfBirth", "cityState", "status", "isInternal", "refCode",
          "referredBy", "paymentProvider", "holdExpiresAt", "ipHash", "consentAt"
        )
        VALUES (
          ${newPublicId()}, ${input.fullName}, ${emailNormalized}, ${emailNormalized},
          ${mobileE164}, ${new Date(input.dateOfBirth)}, ${input.cityState},
          'pending', false, ${newRefCode()}, ${referredBy}, 'stripe',
          ${holdExpiresAt}, ${input.ipHash}, now()
        )
        ON CONFLICT ("emailNormalized") WHERE status IN ('pending', 'paid') DO NOTHING
        RETURNING "publicId"
      `;

      if (inserted.length === 0) {
        // Lost the race: someone else inserted this email between our read and
        // our write. Their row already holds the capacity our hold duplicated,
        // so give the hold back rather than double-counting against the cap.
        await releaseHold();
        const winner = await findActiveByEmail(emailNormalized);
        if (winner) return { ok: true, publicId: winner.publicId, existing: true };
        return { ok: false, reason: 'duplicate' };
      }

      return { ok: true, publicId: inserted[0]!.publicId, existing: false };
    } catch (err) {
      const code = prismaErrorCode(err);
      // P2002 is a publicId/refCode collision, not an email conflict: the
      // INSERT ... ON CONFLICT above only covers the email index.
      if (code === 'P2002' && attempt < 2) continue;

      await releaseHold().catch(() => undefined);
      log.error('registration insert failed', {
        code,
        error: err instanceof Error ? err.message : 'unknown',
      });
      return { ok: false, reason: 'error' };
    }
  }

  await releaseHold().catch(() => undefined);
  return { ok: false, reason: 'error' };
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyOutcome =
  | { readonly replay: true; readonly publicId: string | null; readonly status: number }
  | { readonly replay: false };

/**
 * Returns the previous outcome for this key, if there is one.
 *
 * A double-clicked submit or a client retry then gets the original response
 * rather than a second registration.
 */
export async function lookupIdempotency(scope: string, key: string): Promise<IdempotencyOutcome> {
  const db = await getDb();
  const row = await db.idempotencyRecord.findUnique({
    where: { key: `${scope}:${key}` },
    select: { publicId: true, responseCode: true },
  });
  if (!row) return { replay: false };
  return { replay: true, publicId: row.publicId, status: row.responseCode ?? 200 };
}

export async function recordIdempotency(
  scope: string,
  key: string,
  publicId: string | null,
  status: number,
): Promise<void> {
  const db = await getDb();
  await db.idempotencyRecord
    .upsert({
      where: { key: `${scope}:${key}` },
      update: { publicId, responseCode: status },
      create: {
        key: `${scope}:${key}`,
        scope,
        publicId,
        responseCode: status,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    })
    .catch(() => {
      // A lost idempotency record degrades to "not idempotent", which risks a
      // duplicate row rather than a lost registration. Never fatal.
    });
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export async function joinWaitlist(email: string, source: string | null): Promise<'added' | 'exists'> {
  const db = await getDb();
  try {
    await db.waitlistEntry.create({ data: { email: normalizeEmail(email), source } });
    return 'added';
  } catch (err) {
    if (prismaErrorCode(err) === 'P2002') return 'exists';
    throw err;
  }
}

export async function waitlistSize(): Promise<number> {
  const db = await getDb();
  return db.waitlistEntry.count();
}

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

export const REGISTER_RATE_LIMIT = { perMinute: 5, windowSeconds: 60 };
export const CHECKOUT_RATE_LIMIT = { perMinute: 10, windowSeconds: 60 };

/** Per-email rate limit key. Hashed, so Redis never holds an address. */
export function emailRateKey(email: string): string {
  return `rl:register:email:${hashEmail(email)}`;
}

export { markPaid, paidCount, currentReserved, reconcile } from './capacity';

/** Shareable referral link for a registration. */
export function referralLink(refCode: string): string {
  return `${siteUrl}/friends?ref=${refCode}`;
}

export { hashIp };