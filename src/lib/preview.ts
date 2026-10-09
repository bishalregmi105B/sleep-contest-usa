/**
 * Preview mode.
 *
 * ## Why this exists
 *
 * Vercel's serverless filesystem is read-only apart from `/tmp`, and each
 * instance gets its own. So a SQLite file cannot hold real registrations there:
 * it is wiped on every cold start and is not shared between instances. That is
 * exactly why the production path is PostgreSQL-only.
 *
 * What SQLite *is* good for is a browsable, non-empty deployment that a client
 * or a reviewer can click through without anyone provisioning a database first.
 * That is what this is for.
 *
 * ## What it will never do
 *
 * Take a payment, or accept a registration that promises one. `/api/register`
 * and `/api/checkout` both return a preview state when this is on. The rule
 * that "a production deployment must never issue a ticket without payment" is
 * not something this mode is allowed to weaken, so it cannot.
 *
 * ## When it engages
 *
 * Only when `PREVIEW_MODE=true` **and** no PostgreSQL `DATABASE_URL` is
 * configured. If both are set, PostgreSQL wins and a warning is logged. That
 * ordering is the safety property: configuring a real database can never be
 * overridden by a stale preview flag.
 */
import { existsSync, mkdirSync } from 'node:fs';
import type BetterSqlite3 from 'better-sqlite3';
import path from 'node:path';
import { env, isProduction } from './env';
import { log } from './logger';

const requested = process.env.PREVIEW_MODE === 'true';
const havePostgres =
  env.databaseUrl.startsWith('postgres://') || env.databaseUrl.startsWith('postgresql://');

/**
 * True only when preview mode is on AND there is no real database to talk to.
 *
 * Deliberately conjunctive. `PREVIEW_MODE=true` on a machine that does have a
 * database is a misconfiguration, and silently preferring SQLite there would be
 * the worst possible reading of it.
 */
export const previewEnabled = requested && !havePostgres;

if (requested && havePostgres) {
  log.warn(
    'preview: PREVIEW_MODE is set but DATABASE_URL is a PostgreSQL URL. Using PostgreSQL. ' +
      'Preview mode is a fallback for environments with no database, not an override.',
  );
}

/** True when the deployment is a preview rather than the live site. */
export const isPreview = previewEnabled;

let db: BetterSqlite3.Database | null = null;

/**
 * The database file.
 *
 * `/tmp` when it exists, because that is the only writable location on Vercel
 * and the choice is forced rather than preferred. Locally it lands in
 * `.preview/`, which is gitignored.
 */
function databasePath(): string {
  if (process.env.PREVIEW_DB_PATH) return process.env.PREVIEW_DB_PATH;
  if (existsSync('/tmp')) return '/tmp/sleep-contest-preview.db';
  const dir = path.join(process.cwd(), '.preview');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'preview.db');
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS "Setting" (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS "Counter" (
  id INTEGER PRIMARY KEY, reserved INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "Registration" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publicId TEXT NOT NULL UNIQUE,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  emailNormalized TEXT NOT NULL,
  mobileE164 TEXT NOT NULL,
  dateOfBirth TEXT NOT NULL,
  cityState TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  isInternal INTEGER NOT NULL DEFAULT 0,
  matNumber INTEGER UNIQUE,
  refCode TEXT NOT NULL UNIQUE,
  referredBy TEXT,
  paymentProvider TEXT NOT NULL DEFAULT 'stripe',
  paymentRef TEXT,
  stripeSessionId TEXT,
  holdExpiresAt TEXT,
  ipHash TEXT,
  consentAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paidAt TEXT,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, source TEXT
);
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, receivedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processedAt TEXT, status TEXT NOT NULL DEFAULT 'received', lastError TEXT
);
CREATE TABLE IF NOT EXISTS "EmailOutbox" (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, toEmail TEXT NOT NULL,
  payload TEXT NOT NULL, idempotencyKey TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0, nextAttemptAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastError TEXT, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, sentAt TEXT
);
CREATE INDEX IF NOT EXISTS "Registration_status_idx" ON "Registration"(status);
CREATE INDEX IF NOT EXISTS "Registration_created_idx" ON "Registration"(createdAt, id);
`;

/** The sample set, chosen so the page looks like a campaign rather than a demo. */
function seed(conn: BetterSqlite3.Database): void {
  const existing = conn.prepare('SELECT count(*) AS n FROM "Registration"').get() as { n: number };
  if (existing.n > 0) return;

  const insert = conn.prepare(`
    INSERT INTO "Registration"
      ("publicId","fullName","email","emailNormalized","mobileE164","dateOfBirth","cityState",
       "status","isInternal","matNumber","refCode","referredBy","paymentProvider","paymentRef",
       "consentAt","createdAt","paidAt")
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const FIRST = ['Ada', 'Grace', 'Alan', 'Katherine', 'Linus', 'Barbara', 'Radia', 'Margaret', 'Tim', 'Sofia'];
  const LAST = ['Lovelace', 'Hopper', 'Turing', 'Johnson', 'Torvalds', 'Liskov', 'Perlman', 'Hamilton', 'Berners-Lee', 'Reyes'];
  const CITIES = ['Dallas, TX', 'Austin, TX', 'Houston, TX', 'Denver, CO', 'Phoenix, AZ', 'Atlanta, GA'];

  const COUNT = Number(process.env.PREVIEW_ROWS ?? '1240');
  const now = Date.now();

  const run = conn.transaction(() => {
    for (let i = 0; i < COUNT; i += 1) {
      const first = FIRST[i % FIRST.length]!;
      const last = LAST[(i * 3) % LAST.length]!;
      const email = `preview${i}@example.com`;
      const paid = i % 10 < 6;
      const created = new Date(now - (COUNT - i) * 3_600_000);
      insert.run(
        `preview${String(i).padStart(10, '0')}`,
        `${first} ${last}`,
        email,
        email,
        '15125550134',
        '1990-01-01',
        CITIES[i % CITIES.length]!,
        paid ? 'paid' : i % 10 < 8 ? 'pending' : 'expired',
        i % 50 === 0 ? 1 : 0,
        paid ? i + 1 : null,
        `P${String(i).padStart(8, '0')}`,
        i % 3 === 0 ? `P${String((i % 20) + 1).padStart(8, '0')}` : null,
        'stripe',
        paid ? `pi_preview_${i}` : null,
        created.toISOString(),
        created.toISOString(),
        paid ? created.toISOString() : null,
      );
    }
  });
  run();

  const paid = (conn.prepare(`SELECT count(*) AS n FROM "Registration" WHERE status='paid' AND NOT "isInternal"`).get() as { n: number }).n;
  const reserved = (conn.prepare(`SELECT count(*) AS n FROM "Registration" WHERE status IN ('pending','paid')`).get() as { n: number }).n;
  conn.prepare('INSERT OR REPLACE INTO "Counter" (id, reserved, paid) VALUES (1, ?, ?)').run(reserved, paid);
}

export function previewDb(): BetterSqlite3.Database {
  if (db) return db;

  const file = databasePath();
  // Loaded lazily: this is a Node-only native module and must not be pulled
  // into a bundle for a deployment that never uses it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof BetterSqlite3;
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  seed(db);

  log.info('preview: serving from a seeded SQLite database', {
    file,
    rows: (db.prepare('SELECT count(*) AS n FROM "Registration"').get() as { n: number }).n,
    note: 'Registrations and payments are disabled. This is a browsable preview.',
  });

  return db;
}

/** Closes the handle. Used by tests. */
export function closePreviewDb(): void {
  db?.close();
  db = null;
}

export type PreviewRegistration = {
  publicId: string;
  fullName: string;
  email: string;
  mobileE164: string;
  /** ISO string in the column, `Date` out, matching what Prisma returns. */
  dateOfBirth: Date;
  cityState: string;
  status: string;
  isInternal: boolean;
  matNumber: number | null;
  refCode: string;
  referredBy: string | null;
  paymentProvider: string;
  paymentRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

const SELECT_COLUMNS = `"publicId","fullName","email","mobileE164","dateOfBirth","cityState",
  "status","isInternal","matNumber","refCode","referredBy","paymentProvider","paymentRef",
  "createdAt","paidAt"`;

/** Row → the shape the repository returns. Dates become `Date`, as Prisma does. */
function toRegistration(row: Record<string, unknown>): PreviewRegistration {
  return {
    ...(row as unknown as PreviewRegistration),
    dateOfBirth: new Date(String(row.dateOfBirth)),
    createdAt: new Date(String(row.createdAt)),
    paidAt: row.paidAt ? new Date(String(row.paidAt)) : null,
    isInternal: Boolean(row.isInternal),
  };
}

export function previewCountPaid(): number {
  const row = previewDb().prepare(`SELECT count(*) AS n FROM "Registration" WHERE status='paid' AND NOT "isInternal"`).get() as { n: number };
  return row.n;
}

export function previewReserved(): number {
  const row = previewDb().prepare(`SELECT count(*) AS n FROM "Registration" WHERE status IN ('pending','paid')`).get() as { n: number };
  return row.n;
}

export function previewFindByPublicId(publicId: string): PreviewRegistration | null {
  const row = previewDb().prepare(`SELECT ${SELECT_COLUMNS} FROM "Registration" WHERE publicId = ?`).get(publicId) as Record<string, unknown> | undefined;
  return row ? toRegistration(row) : null;
}

export function previewTopRecruiters(limit: number): { refCode: string; matNumber: number | null; count: number }[] {
  const rows = previewDb()
    .prepare(
      `SELECT "referredBy" AS refCode, count(*) AS count FROM "Registration"
       WHERE "referredBy" IS NOT NULL AND status='paid'
       GROUP BY "referredBy" ORDER BY count DESC, "referredBy" ASC LIMIT ?`,
    )
    .all(limit) as { refCode: string; count: number }[];

  const owners = new Map<string, number | null>();
  for (const row of rows) {
    const owner = previewDb().prepare('SELECT "matNumber" FROM "Registration" WHERE "refCode" = ?').get(row.refCode) as { matNumber: number | null } | undefined;
    owners.set(row.refCode, owner?.matNumber ?? null);
  }
  return rows.map((row) => ({ refCode: row.refCode, count: row.count, matNumber: owners.get(row.refCode) ?? null }));
}

export function previewDailyPaid(days: number): { date: string; count: number }[] {
  const rows = previewDb()
    .prepare(`SELECT substr("paidAt", 1, 10) AS date, count(*) AS count FROM "Registration"
              WHERE "paidAt" IS NOT NULL GROUP BY date`)
    .all() as { date: string; count: number }[];

  const counts = new Map(rows.map((r) => [r.date, r.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, count: counts.get(date) ?? 0 });
  }
  return out;
}

export function previewTotal(): number {
  return (previewDb().prepare('SELECT count(*) AS n FROM "Registration"').get() as { n: number }).n;
}

export function previewCountByStatus(): Record<string, number> {
  const rows = previewDb().prepare('SELECT status, count(*) AS n FROM "Registration" GROUP BY status').all() as { status: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export function previewCountReferred(): number {
  return (previewDb().prepare('SELECT count(*) AS n FROM "Registration" WHERE "referredBy" IS NOT NULL').get() as { n: number }).n;
}

export function previewHighestMat(): number {
  const row = previewDb().prepare('SELECT max("matNumber") AS m FROM "Registration"').get() as { m: number | null };
  return row.m ?? 0;
}

export function previewList(
  options: { limit: number; status?: string; query?: string },
): PreviewRegistration[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (options.status) {
    where.push('status = ?');
    params.push(options.status);
  }
  if (options.query) {
    where.push('("fullName" LIKE ? OR "email" LIKE ?)');
    params.push(`%${options.query}%`, `%${options.query}%`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = previewDb()
    .prepare(`SELECT ${SELECT_COLUMNS} FROM "Registration" ${clause} ORDER BY "createdAt" DESC, id DESC LIMIT ?`)
    .all(...params, options.limit) as Record<string, unknown>[];
  return rows.map(toRegistration);
}

export function previewOutboxHealth(): { pending: number; retry: number; dead: number; oldestPendingAgeHours: number | null } {
  return { pending: 0, retry: 0, dead: 0, oldestPendingAgeHours: null };
}

export { isProduction as previewIsProduction };
