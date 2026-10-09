import { getDb, prismaErrorCode } from './db';

/**
 * Data access for pages, admin views and exports.
 *
 * Replaces `src/lib/store/*`, which had two implementations selected at runtime
 * — a Prisma one and an in-memory one — and defaulted to the in-memory one.
 * There is one backend now, so there is one module.
 *
 * The previous `dailyPaid` and `topRecruiters` each ran an unbounded
 * `findMany`/`groupBy` over the whole table on every admin page load. Both are
 * aggregates below, done in SQL with a bounded result, and both are cached by
 * the admin route.
 */

export type PublicRegistration = {
  publicId: string;
  fullName: string;
  email: string;
  mobileE164: string;
  cityState: string;
  status: string;
  matNumber: number | null;
  refCode: string;
  referredBy: string | null;
  paymentProvider: string;
  createdAt: Date;
  paidAt: Date | null;
  isInternal: boolean;
};

export async function findByPublicId(publicId: string): Promise<PublicRegistration | null> {
  const db = await getDb();
  return db.registration.findUnique({
    where: { publicId },
    select: {
      publicId: true,
      fullName: true,
      email: true,
      mobileE164: true,
      cityState: true,
      status: true,
      matNumber: true,
      refCode: true,
      referredBy: true,
      paymentProvider: true,
      createdAt: true,
      paidAt: true,
      isInternal: true,
    },
  });
}

export async function findActiveByEmail(emailNormalized: string): Promise<PublicRegistration | null> {
  const db = await getDb();
  // Matches reg_email_active_uq: only one row can be pending or paid.
  return db.registration.findFirst({
    where: { emailNormalized, status: { in: ['pending', 'paid'] } },
    select: {
      publicId: true,
      fullName: true,
      email: true,
      mobileE164: true,
      cityState: true,
      status: true,
      matNumber: true,
      refCode: true,
      referredBy: true,
      paymentProvider: true,
      createdAt: true,
      paidAt: true,
      isInternal: true,
    },
  });
}

export async function findByRefCode(refCode: string): Promise<{ refCode: string } | null> {
  const db = await getDb();
  return db.registration.findUnique({ where: { refCode }, select: { refCode: true } });
}

export async function updatePendingFields(
  publicId: string,
  patch: { fullName: string; mobileE164: string; cityState: string; dateOfBirth: Date },
): Promise<void> {
  const db = await getDb();
  await db.registration.update({ where: { publicId }, data: patch });
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

/**
 * Paid registrations per day, oldest first, including empty days.
 *
 * Aggregate in SQL rather than pulling every row in the window and counting in
 * JavaScript, which is what the store did.
 */
export async function dailyPaid(days: number): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
    SELECT to_char("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::bigint AS count
    FROM "Registration"
    WHERE "paidAt" >= ${since} AND NOT "isInternal"
    GROUP BY 1
  `;

  const counts = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, count: counts.get(date) ?? 0 });
  }
  return out;
}

/**
 * Referral leaderboard.
 *
 * Counts **paid** referrals only. Counting pending registrations would let
 * someone inflate the public leaderboard by sharing a link and abandoning
 * checkout, which is the same class of dishonesty as a fabricated counter.
 *
 * Bounded by `limit` and served by reg_referred_ix.
 */
export async function topRecruiters(
  limit: number,
): Promise<{ refCode: string; matNumber: number | null; count: number }[]> {
  const db = await getDb();

  const grouped = await db.$queryRaw<Array<{ referredBy: string; count: bigint }>>`
    SELECT "referredBy", count(*)::bigint AS count
    FROM "Registration"
    WHERE "referredBy" IS NOT NULL AND status = 'paid'
    GROUP BY "referredBy"
    ORDER BY count DESC, "referredBy" ASC
    LIMIT ${limit}
  `;

  if (grouped.length === 0) return [];

  const codes = grouped.map((row) => row.referredBy);
  const owners = await db.registration.findMany({
    where: { refCode: { in: codes } },
    select: { refCode: true, matNumber: true },
  });
  const byCode = new Map(owners.map((row) => [row.refCode, row.matNumber]));

  return grouped.map((row) => ({
    refCode: row.referredBy,
    count: Number(row.count),
    matNumber: byCode.get(row.referredBy) ?? null,
  }));
}

/** Total rows, for the admin health card and funnel. */
export async function totalRegistrations(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM "Registration"`;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Registrations that came from someone's referral link.
 *
 * A separate query rather than a derivation, because "how many people are on
 * the leaderboard" and "how many have paid" are different questions. Coinciding
 * in one snapshot does not make them the same number.
 */
export async function countReferred(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count FROM "Registration" WHERE "referredBy" IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * The highest mat number issued.
 *
 * `MAX(matNumber)` is O(1) against `Registration_matNumber_key`, which is the
 * unique index. It is the true highest, including any issued to an internal
 * registration, because that is what "mats assigned" means operationally.
 */
export async function highestMat(): Promise<number> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX("matNumber") AS max FROM "Registration" WHERE "matNumber" IS NOT NULL
  `;
  return rows[0]?.max ?? 0;
}

export async function countByStatus(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status, count(*)::bigint AS count FROM "Registration" GROUP BY status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}

// ---------------------------------------------------------------------------
// Admin listing and export
// ---------------------------------------------------------------------------

/**
 * A page of registrations, by keyset rather than offset.
 *
 * OFFSET is O(rows skipped): at 200,000 registrations, page 900 would read and
 * discard 180,000 rows to show 20. Keyset seeks on (createdAt, id), which is
 * the index reg_status_created_ix already supports.
 */
export type ListCursor = { createdAt: Date; id: bigint } | null;

export async function listRegistrations(
  options: { limit: number; cursor?: ListCursor; query?: string; status?: string },
): Promise<{ rows: AdminRow[]; nextCursor: ListCursor }> {
  const db = await getDb();
  const limit = options.limit;

  const where: Record<string, unknown> = {};
  if (options.status) where.status = options.status;
  if (options.query) {
    where.OR = [{ fullName: { contains: options.query } }, { email: { contains: options.query } }];
  }
  if (options.cursor) {
    // (createdAt, id) < (cursor.createdAt, cursor.id), row-comparison form.
    where.AND = [
      {
        OR: [
          { createdAt: { lt: options.cursor.createdAt } },
          {
            AND: [
              { createdAt: options.cursor.createdAt },
              { id: { lt: options.cursor.id } },
            ],
          },
        ],
      },
    ];
  }

  const rows = await db.registration.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      mobileE164: true,
      cityState: true,
      status: true,
      matNumber: true,
      refCode: true,
      referredBy: true,
      isInternal: true,
      paymentProvider: true,
      paymentRef: true,
      createdAt: true,
      paidAt: true,
    },
  });

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    rows: page,
    nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

export type AdminRow = {
  id: bigint;
  publicId: string;
  fullName: string;
  email: string;
  mobileE164: string;
  cityState: string;
  status: string;
  matNumber: number | null;
  refCode: string;
  referredBy: string | null;
  isInternal: boolean;
  paymentProvider: string;
  paymentRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

/**
 * Walks every row for the CSV export, in batches.
 *
 * Yields rather than returning an array: at 200,000 rows the old export built
 * the entire table plus a joined string in memory, which is an out-of-memory
 * kill on a serverless instance. The route pipes these batches straight out.
 */
export async function* iterateAllRegistrations(batchSize = 1_000): AsyncGenerator<AdminRow[]> {
  let cursor: ListCursor = null;

  for (;;) {
    const { rows, nextCursor } = await listRegistrations({ limit: batchSize, cursor });
    if (rows.length === 0) return;
    yield rows;
    if (!nextCursor) return;
    cursor = nextCursor;
  }
}

/** Flags a registration as internal so it is excluded from public counts. */
export async function setInternal(publicId: string, isInternal: boolean): Promise<void> {
  const db = await getDb();
  const row = await db.registration.findUnique({ where: { publicId }, select: { status: true } });
  await db.registration.update({ where: { publicId }, data: { isInternal } });

  // Keep the denormalised paid count honest when the flag crosses the boundary.
  if (row?.status === 'paid') {
    const delta = isInternal ? -1 : 1;
    await db.$queryRaw`UPDATE "Counter" SET paid = GREATEST(0, paid + ${delta}) WHERE id = 1`;
  }
}

/**
 * Deletes or anonymises a registrant, for a data-erasure request.
 *
 * Anonymise is the default: it preserves the row so the paid count, the mat
 * number and the audit trail stay intact, while removing the personal data. A
 * hard delete is available for registrations that never became paid.
 */
export async function deleteOrAnonymize(
  publicId: string,
  mode: 'anonymize' | 'delete',
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  const row = await db.registration.findUnique({ where: { publicId }, select: { status: true, matNumber: true } });
  if (!row) return { ok: false, reason: 'not_found' };

  if (mode === 'delete') {
    if (row.status === 'paid') {
      return { ok: false, reason: 'paid_registrations_are_anonymised_not_deleted' };
    }
    await db.registration.delete({ where: { publicId } });
    await db.$queryRaw`UPDATE "Counter" SET reserved = GREATEST(0, reserved - 1) WHERE id = 1`;
    return { ok: true };
  }

  await db.registration.update({
    where: { publicId },
    data: {
      fullName: 'Deleted',
      email: `deleted+${publicId.slice(0, 8)}@anonymised.invalid`,
      mobileE164: '0',
      cityState: 'Deleted',
      ipHash: null,
    },
  });
  return { ok: true };
}

export { prismaErrorCode };