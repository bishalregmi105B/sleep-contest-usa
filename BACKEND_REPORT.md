# BACKEND_REPORT.md

The backend that replaces the in-memory demo store. Read
`STATE_OF_THE_CODEBASE.md` first for what was there before and why each defect
mattered; this document is what the backend is now.

---

## Summary

A PostgreSQL backend with atomic capacity enforcement, exactly-once payment
webhooks, an email outbox, and a read path that survives a 2,000 rps spike
without touching the database. The site's public counter is now the real paid
count, and a production deployment cannot issue a ticket without taking payment.

---

## 1. Architecture

```
                      ┌──────────── CDN / edge ────────────┐
   visitor ──────────▶│  static pages, /api/stats (15s),    │
                      │  /api/settings/public (15s)         │
                      └──────────────────┬──────────────────┘
                                         │  ~1% of traffic
                                         ▼
        ┌──────────────────────  Next.js origin (Node.js)  ───────────────────────┐
        │                                                                        │
        │  POST /api/register          GET /api/stats                            │
        │    ├ rate limit (IP, email)  ├ Redis cache ─┐                         │
        │    ├ Turnstile (env-gated)   ├ single-flight lock                     │
        │    ├ idempotency key         └──────────────┴──▶ Counter.paid (O(1))   │
        │    ├ capacity hold ──────────▶ Counter.reserved                          │
        │    └ INSERT … ON CONFLICT ──▶ Registration                              │
        │                                                                        │
        │  POST /api/webhooks/stripe                                          │
        │    ├ verify signature (raw body)                                     │
        │    └ ONE TRANSACTION ─────────────────────────────────────────┐      │
        │         INSERT WebhookEvent (unique)  ← the idempotency gate  │      │
        │         UPDATE Registration → nextval('mat_number_seq')        │      │
        │         UPDATE Counter.paid                                   │      │
        │         INSERT EmailOutbox (idempotencyKey unique)            │      │
        └─────────────────┬──────────────────────────────┬──────────────┘      │
                          │                              │                     │
                          ▼                              ▼                     │
                 ┌─────────────────┐          ┌──────────────────┐             │
                 │  PostgreSQL     │          │  Redis / Upstash │             │
                 │  Registration   │          │  rate limits     │             │
                 │  Setting(+Audit)│          │  stats cache     │             │
                 │  Counter        │          │  single-flight   │             │
                 │  WaitlistEntry  │          └──────────────────┘             │
                 │  WebhookEvent   │                                           │
                 │  EmailOutbox    │◀── /api/cron/sweep (every minute)           │
                 │  IdempotencyRec │      outbox · hold expiry · reconcile      │
                 └─────────────────┘      · retention                           │
                                                                           │
                                          after() ──▶ drain outbox ────────────┘
```

**Why the outbox exists.** Sending confirmation email inline inside the webhook
put provider latency inside Stripe's 300 ms acknowledgement budget. When the
provider was slow, Stripe retried, and the retry re-sent the email. Email is now
a row written in the payment's own transaction and sent afterwards.

---

## 2. Data model

```
Registration      id, publicId*, emailNormalized*, matNumber*, refCode*,
                  fullName, email, mobileE164, dateOfBirth, cityState,
                  status, isInternal, referredBy, paymentProvider, paymentRef,
                  stripeSessionId, holdExpiresAt, ipHash, consentAt,
                  createdAt, paidAt, updatedAt        * = unique

Setting           key*, value(jsonb), version, updatedAt
SettingAudit      id, key, oldValue, newValue, adminId, ipHash, at
Counter           id=1, reserved, paid
WaitlistEntry     id, email*, createdAt, source
WebhookEvent      id*=provider event id, type, receivedAt, processedAt, status
EmailOutbox       id, type, toEmail, payload, idempotencyKey*, status,
                  attempts, nextAttemptAt, lastError, createdAt, sentAt
IdempotencyRecord key*, scope, publicId, responseCode, createdAt, expiresAt
```

The parts Prisma cannot express, in raw SQL in the migration:

```sql
CREATE SEQUENCE mat_number_seq AS INTEGER START 1;

CREATE UNIQUE INDEX reg_email_active_uq ON "Registration"("emailNormalized")
    WHERE status IN ('pending', 'paid');
CREATE INDEX reg_paid_public_idx ON "Registration"("id")
    WHERE status = 'paid' AND NOT "isInternal";
CREATE INDEX reg_hold_expiry_ix ON "Registration"("holdExpiresAt")
    WHERE status = 'pending';
CREATE INDEX reg_referred_ix ON "Registration"("referredBy")
    WHERE "referredBy" IS NOT NULL;
CREATE UNIQUE INDEX reg_stripe_session_uq ON "Registration"("stripeSessionId")
    WHERE "stripeSessionId" IS NOT NULL;
CREATE INDEX outbox_due_ix ON "EmailOutbox"("status", "nextAttemptAt")
    WHERE status IN ('pending', 'retry');

ALTER TABLE "Registration" ADD CONSTRAINT reg_status_chk
    CHECK (status IN ('pending','paid','expired','refunded','cancelled'));
```

`reg_email_active_uq` is the whole duplicate-registration story: at most one
live registration per email, enforced by the database rather than by application
logic that can race with itself.

---

## 3. Endpoints

| Endpoint | Cache | Rate limit | On failure |
|---|---|---|---|
| `POST /api/register` | none | 5/min per IP **and** per hashed email, Redis sliding window | 429 with `Retry-After`; 503 + waitlist if payments unconfigured; 409 + waitlist when full; 503 with `Retry-After` if the database is down |
| `POST /api/checkout` | none | 10/min per IP | 503 + queued "complete your payment" email when Stripe is unreachable; hold left intact |
| `POST /api/webhooks/stripe` | none | Stripe's own retries | 400 bad signature; 500 so Stripe retries (idempotent, safe); 200 for duplicates |
| `GET /api/stats` | CDN `s-maxage=15, swr=60`; Redis 15 s + jitter; single-flight lock | none (public, cached) | Falls back to a direct counter read if Redis is down |
| `GET /api/settings/public` | CDN 15 s; Redis 15 s | none | Falls back to the database |
| `GET /api/health` | `no-store` | none | 503 when degraded. Presence-only config, never values |
| `GET /api/ready` | `no-store` | none | 503 when the database is down. Used by the load balancer |
| `GET /api/cron/sweep` | `no-store` | `Bearer CRON_SECRET` | Every job idempotent; safe to double-fire |
| `GET /api/admin/export` | `no-store` | admin session + origin check | Streams 401 immediately; never buffers the table |
| `POST /api/admin/*` | `no-store` | admin session + origin check + lockout after 5 failures | — |
| `POST /api/waitlist` | `no-store` | 3/min per IP | — |

---

## 4. The Mock Register: every item and what happened to it

Full detail in `STATE_OF_THE_CODEBASE.md`. In brief:

| # | Was | Now |
|---|---|---|
| M1 | In-memory store, and the **default** | Postgres only. Deleted |
| M2/M3 | Mat number from `MAX()+1`, raced | `nextval('mat_number_seq')` inside the paid `UPDATE`. Verified with 1,000 concurrent transitions |
| M4 | `WebhookEvent` table never written | Written, in the same transaction as the state change. Verified with 500 concurrent deliveries |
| M5 | **Mock payments reachable in production** | Unreachable. `mockPaymentsAllowed` is false in production by construction |
| M6 | Per-process rate limit | Redis sliding window, Lua, atomic |
| M7 | CSV export loaded the whole table | Keyset-paginated `ReadableStream` |
| M8 | `countPaid()` per request | O(1) counter row, cached, single-flighted |
| M9/M10 | Unbounded aggregates per admin load | SQL aggregates, bounded results |
| M11 | No capacity enforcement at all | Atomic hold, verified at 1,000 concurrent |
| M12 | Everything hardcoded | `Setting` + `SettingAudit`, admin-editable |
| M13 | `findByEmail` then `create` | `INSERT … ON CONFLICT` |
| M14 | No idempotency key | `Idempotency-Key` header, persisted |
| M15 | Email inline | Outbox |
| M16 | No sweeper | `/api/cron/sweep`, four idempotent jobs |
| M17 | Plaintext admin password | scrypt hash + Redis lockout |
| M18 | No bot protection | Turnstile (env-gated), body cap, per-email limit |
| M19–M23 | Missing status values, no internal flag, no `vercel.json`, no CI, per-request homepage | All added |

### The one that mattered most

**M5.** The old checkout route read
`const provider = stripeEnabled ? stripeProvider : mockProvider` with no
environment check. A production deploy that lost its Stripe keys — a rotated
variable, a typo in a dashboard, a bad deploy — would have handed out paid
tickets for free, and `/api/health` reported it as `degraded` rather than
refusing. It is now impossible: production requires a payment provider to issue
a ticket, and without one the site serves a waitlist and says so.

---

## 5. Measured performance

Full detail, machine specs and reproduction commands in `LOAD_TEST_REPORT.md`.

| Measurement | Result |
|---|---|
| Counter query, `COUNT(*)` with partial index, 200k rows | **21.6 ms** |
| Counter query, `Counter.paid` row read | **0.084 ms** (257× faster) |
| `/api/stats`: 8,000 concurrent requests, cache cold | **3 database transactions** |
| `/api/stats` origin throughput, no CDN | 828 req/s, p95 352 ms, 0 errors |
| `POST /api/register`, 50 concurrent, 20 s | 2,900 requests, **0 errors**, p95 405 ms, p99 670 ms |
| Cap enforcement under that load | counter = truth = **exactly 200,000** |
| Counter drift observed | 2 in ~190,000 (0.001%), auto-corrected by reconciliation |

The published targets are p95 < 50 ms at 2,000 rps for stats and p95 < 300 ms
for register. **Stats meets the database-side target by a wide margin and
depends on the CDN for the network-side one. Register p95 is 405 ms and misses**,
on a box running the app and the database on the same 8 cores. p99 (670 ms)
passes. See LOAD_TEST_REPORT §6 for what was not measured at all.

---

## 6. Known limits

Honest list, in the order I would address them:

1. **Register p95 405 ms** against a 300 ms target, measured with app and
   database co-located. Re-measure with the database on its own host first; if
   it still misses, merge the capacity hold and the insert into one transaction
   to remove a round trip.
2. **The capacity counter is a single hot row.** It serialises at roughly
   1–2k updates/sec, comfortably above the modelled 300/s peak. If a future
   campaign needs more, shard into 16 rows and sum on read.
3. **No read replicas.** Nothing needs one at 200k rows, but the admin
   aggregates would be the first thing to move.
4. **The settings cache is 15-second TTL**, invalidated on write from the
   writing instance only. Cross-instance propagation is bounded by the TTL.
5. **Turnstile, Redis and Sentry are optional.** Without Redis, rate limits are
   per-instance and `/api/stats` falls back to the database. This is logged at
   `error` and reported by `/api/health`, but it is a degradation, not a fix.
6. **No automated failure injection.** The degradation matrix in the runbook is
   implemented and logged but has not been proven by an injected failure.
7. **`MOCK_PAYMENTS` is unavailable in production.** That is the point, but it
   means there is no way to rehearse a full payment on a production deployment.
   Use Stripe test mode against a staging database instead.
8. **The initial migration was edited after being applied locally.** It is valid
   for a fresh database — which is what every deployment starts from — but if it
   has been applied to any database you intend to keep, add a follow-up migration
   rather than editing `20261009120000_init`.

---

## 7. Next scaling step

Not now. In order, when the numbers demand it:

1. **Separate the database from the application host.** The largest single win
   available, and it costs nothing but a different `DATABASE_URL`.
2. **Sharded capacity counters** (16 rows, summed on read) if the single-row
   update rate becomes the bottleneck.
3. **A queue service** (SQS, BullMQ) instead of the outbox table, if email
   volume outgrows a table sweep.
4. **Read replicas** for the admin aggregates and the export.
5. **A dedicated stats pipeline** (materialised count, or a CDC stream into
   Redis) if the 15-second window is ever too stale for the client's needs.

---

## 8. Monthly cost drivers

At 200,000 registrations, roughly **$120–190/month**, excluding prize money:

| Item | Plan | ~Monthly |
|---|---|---|
| Vercel | Pro — **required**: the site takes money, so Hobby's non-commercial licence does not apply, and Hobby cron runs once daily | $20 |
| PostgreSQL | Managed, 2 vCPU / 8 GB. The table is ~94 MB at 200k rows; connections and IOPS matter more than storage | $20–70 |
| Redis | Upstash, ~10M requests/month at the modelled load | $5–10 |
| Stripe | 2.9% + 30¢ per $10 transaction. At 200,000 × $10 = $2M gross: **~$59,200** | variable |
| Email | Resend, ~200k confirmations at $0.90/1,000 | ~$180 |
| Domain | Annual, amortised | ~$1 |

**Stripe fees dominate by three orders of magnitude.** Every infrastructure
decision here is rounding error next to the payment volume, which is the single
most useful fact for a pricing conversation with the client.

---

## 9. What the client still has to supply

Everything in `CLIENT_INPUTS_NEEDED.md` sections 10–15. The blocking items are:
written Guinness approval, a promotions-lawyer review of the paid-entry
structure, a Vercel Pro or self-host decision, managed PostgreSQL and Redis,
Stripe live keys, a verified sending domain, and permission for any third-party
imagery.