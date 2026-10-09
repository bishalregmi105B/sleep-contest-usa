#!/usr/bin/env node
/**
 * Seeds 200,000 registrations, so load tests run against a realistically sized
 * table rather than an empty one.
 *
 * An empty table makes every number meaningless: COUNT(*) on zero rows is
 * instant, and an index-only scan on 140,000 entries is not. The whole point is
 * to find the query that is slow at full size, which means the data has to
 * actually be there.
 *
 * Uses a single INSERT ... SELECT FROM generate_series, which seeds 200,000 rows
 * in a few seconds. A loop of individual inserts would take minutes and would
 * not reproduce the vacuum/visibility-map state a real table has been in for a
 * while, which is exactly where the counter query's cost is decided.
 *
 * Usage:
 *   DATABASE_URL=... node loadtest/seed-200k.mjs [--rows 200000] [--reset]
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

for (const file of ['.env.local', '.env']) {
  const full = path.join(process.cwd(), file);
  if (existsSync(full)) Object.assign(process.env, parseEnv(readFileSync(full, 'utf8')));
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim().replace(/^["']|["']$/g, '');
    out[match[1]] = value;
  }
  return out;
}

const args = process.argv.slice(2);
const rows = Number(args[args.indexOf('--rows') + 1]) || 200_000;
const reset = args.includes('--reset');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL or DIRECT_URL must be set.');
  process.exit(1);
}

const { Client } = await import('pg');
const client = new Client({ connectionString: url });

const started = Date.now();

await client.connect();

if (reset) {
  console.log('truncating…');
  await client.query(`
    TRUNCATE TABLE "Registration", "WebhookEvent", "EmailOutbox",
      "IdempotencyRecord", "WaitlistEntry", "SettingAudit", "Setting"
    RESTART IDENTITY CASCADE
  `);
  await client.query('UPDATE "Counter" SET reserved = 0, paid = 0 WHERE id = 1');
  await client.query(`SELECT setval('mat_number_seq', 1, false)`);
}

// 70% paid, 20% pending, 10% expired, with 2% flagged internal so the
// "paid and not internal" filter is actually doing work.
console.log(`inserting ${rows.toLocaleString('en-US')} rows…`);
await client.query(
  `
  INSERT INTO "Registration" (
    "publicId", "fullName", "email", "emailNormalized", "mobileE164", "dateOfBirth",
    "cityState", "status", "isInternal", "refCode", "referredBy",
    "paymentProvider", "holdExpiresAt", "consentAt", "createdAt", "paidAt"
  )
  SELECT
    'lt' || lpad(i::text, 13, '0'),
    'Load Test ' || i,
    'p' || i || '@example.com',
    'p' || i || '@example.com',
    '1555' || lpad((i % 10000)::text, 7, '0'),
    DATE '1990-01-01',
    'City ' || (i % 50),
    CASE WHEN i % 10 < 7 THEN 'paid' WHEN i % 10 < 9 THEN 'pending' ELSE 'expired' END,
    (i % 50 = 0),
    'L' || lpad(i::text, 9, '0'),
    CASE WHEN i % 3 = 0 THEN 'L' || lpad((i % 500)::text, 9, '0') ELSE NULL END,
    'stripe',
    CASE WHEN i % 10 >= 7 AND i % 10 < 9 THEN now() + interval '30 minutes' ELSE NULL END,
    now(),
    now() - make_interval(days => (i % 90)),
    CASE WHEN i % 10 < 7 THEN now() - make_interval(days => (i % 90)) ELSE NULL END
  FROM generate_series(1, $1) AS i
  ON CONFLICT DO NOTHING
  `,
  [rows],
);

// The visibility map is what decides whether the counter query can do an
// index-only scan or has to visit the heap. Seeding without a VACUUM would
// measure the worst case and quietly overstate the cost, so vacuum and analyse
// to get the steady-state numbers a real deployment would see.
console.log('analysing…');
await client.query('VACUUM (ANALYZE) "Registration"');

const paidResult = await client.query(
  `SELECT count(*)::int AS paid FROM "Registration" WHERE status = 'paid' AND NOT "isInternal"`,
);
const reservedResult = await client.query(
  `SELECT count(*)::int AS reserved FROM "Registration" WHERE status IN ('pending','paid')`,
);

await client.query('UPDATE "Counter" SET paid = $1, reserved = $2 WHERE id = 1', [paidResult.rows[0].paid, reservedResult.rows[0].reserved]);
await client.query(`SELECT setval('mat_number_seq', GREATEST((SELECT COALESCE(MAX("matNumber"),0) FROM "Registration"), 1))`);

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `seeded ${rows.toLocaleString('en-US')} rows in ${elapsed}s — ` +
    `${paidResult.rows[0].paid.toLocaleString('en-US')} paid/non-internal, ${reservedResult.rows[0].reserved.toLocaleString('en-US')} holding capacity`,
);
console.log('counters reconciled to the true values');

await client.end();
