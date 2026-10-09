# STATE OF THE CODEBASE

Written in Phase 0 of `CHANGE_REQUEST_PROMPT.md`, before any code was changed, by
reading the repository and running it. Every claim below was checked against the
code, not against the existing reports. Where a report and the code disagree, the
disagreement is recorded rather than resolved in favour of the report.

Branch: `change-request-backend`. Base commit: `5571f4d`.

---

## 1. Stack and versions

| Piece | Version | Notes |
|---|---|---|
| Next.js | 16.4.0 | App Router, `cacheComponents: true`, `partialPrefetching: true` |
| React | 19.3.0 | |
| Prisma | 7.10.0 | Driver adapters, `prisma.config.ts` holds the URL |
| Postgres driver | `pg` 8.23.1 via `@prisma/adapter-pg` | |
| Stripe | 23.0.0 | |
| Resend | 6.32.1 | |
| zod | 4.6.5 | Shared client/server schemas |
| Tailwind | 4 (`@tailwindcss/turbopack`) | |
| TypeScript | 5 | `strict` |
| Test runner | **none installed** | `scripts/check.mjs` and `scripts/smoke.mjs` are the only automated checks; Playwright is a devDependency but **no Playwright test file exists** |
| Load tooling | **none installed** | no k6, no autocannon dependency |

`package.json` has **no `test` script and no `prebuild` typecheck**. `prebuild`
runs `scripts/scan-assets.mjs` only.

---

## 2. Routes, and what each one really does

| Route | Reality |
|---|---|
| `GET /` | Server component. Reads `paidCount()` from the store on every request, so it **hits the database per request** and is not static. |
| `GET /ticket/[publicId]` | Server component, store read per request. |
| `GET /friends` | Static-ish, reads referral params client-side. |
| `GET /admin` | Dashboard; reads aggregates per request. |
| `GET /admin#login` | Client-side login form. |
| `POST /api/register` | Validates, honeypot, then `findByEmail` → `create`. **Not idempotent, no capacity check, no rate limit by email.** |
| `POST /api/checkout` | Picks `mockProvider` whenever `stripeEnabled` is false — **including in production** — then marks the registration paid. |
| `POST /api/webhooks/stripe` | Verifies signature, then `markPaid` + `sendConfirmation`. **Never writes to `WebhookEvent`; no transaction.** |
| `GET /api/stats` | `countPaid()` per request. `s-maxage=30` on a response that is also `connection()`-forced. |
| `GET /api/health` | Reports provider configuration. Genuinely useful; no secrets leaked. |
| `GET /api/admin/export` | `store.all()` → whole table into a string, then `join`. |
| `POST /api/admin/login` | Per-IP rate limit, plain password compare. |

---

## 3. Mock Register

| # | File / line | What is mocked or missing | Production replacement | Phase |
|---|---|---|---|---|
| M1 | `src/lib/store/memory.ts:16` | Whole store is an in-memory array. `getStore()` falls back to it whenever `DATABASE_URL` is not a Postgres URL — which is the **default**, since `.env.example` ships `DATABASE_URL="file:./dev.db"`. | Postgres only. Delete the memory store from the production path. | P1 |
| M2 | `src/lib/store/memory.ts:56` | `markPaid` computes the mat number as `max + 1` over a JS array. | `nextval('mat_number_seq')` in one `UPDATE`. | P1 |
| M3 | `src/lib/store/database.ts:90` | `markPaid` computes the mat number as `ORDER BY matNumber DESC LIMIT 1` then `+1`, inside a transaction, retrying on `P2002`. This is a **read-modify-write race**. At any real concurrency two transactions read the same max and collide; the retry loop is a band-aid, not a fix. | Single atomic `UPDATE … SET "matNumber" = nextval(…) WHERE id = $1 AND status = 'pending' RETURNING *`. | P1/P3 |
| M4 | `src/app/api/webhooks/stripe/route.ts:41` | `WebhookEvent` exists in `schema.prisma` and is **never written to**. The comment above it claims replay is handled; no code does it. A replayed event re-runs `markPaid` (idempotent) **and re-sends the confirmation email**. | Insert the event id, unique; skip if present. One transaction for transition + outbox + ledger. | P3 |
| M5 | `src/app/api/checkout/route.ts:46` | `const provider = stripeEnabled ? stripeProvider : mockProvider` with no `NODE_ENV` guard. **In production without Stripe keys this issues a real paid ticket and takes no money.** | Mock is development/test only; production without Stripe serves a waitlist and issues nothing. | P3 |
| M6 | `src/lib/rate-limit.ts:14` | `new Map()` token bucket, per process. Resets on deploy, not shared across instances, so the limit is roughly "limit ÷ instance count" on a serverless host. | Redis sliding window via `lib/kv.ts`. | P2 |
| M7 | `src/app/api/admin/export/route.ts:24` | `store.all()` → `findMany({})` with no limit. At 200,000 rows this allocates the entire table in memory per export. | Keyset-paginated `ReadableStream` CSV. | P5 |
| M8 | `src/app/api/stats/route.ts:19` | `countPaid()` per request, no Redis cache, no single-flight. A 2,000 rps spike is 2,000 `COUNT(*)` queries. | Redis + CDN cache with single-flight locking. | P4 |
| M9 | `src/lib/store/database.ts:144` | `dailyPaid` pulls every paid row from the window with no `select` cap beyond the two columns and no aggregate — it is an unbounded `findMany` per admin page load. | `GROUP BY` aggregate, cached 60 s. | P4 |
| M10 | `src/lib/store/database.ts:173` | `topRecruiters` is an unindexed `GROUP BY referredBy` over the whole table on every admin load. | Cached aggregate (60 s). | P4 |
| M11 | whole repo | **No capacity enforcement at all.** No cap, no holds, no `Counter` row, no `maxRegistrations`. The number 200,000 is a hardcoded constant in `src/content/site.ts:82`. | `Counter` row + atomic hold. | P2 |
| M12 | whole repo | **No settings table.** Goal, threshold, sponsor, contact and social links are hardcoded in `src/content/site.ts` and env vars. Nothing is admin-editable. | `Setting` / `SettingAudit`. | P5 |
| M13 | `src/app/api/register/route.ts:52` | `findByEmail` then `create` is a time-of-check/time-of-time-of-use gap. Two simultaneous submits with the same email create two rows. | `INSERT … ON CONFLICT` against a partial unique index on active emails. | P2 |
| M14 | whole repo | **No idempotency key handling.** A double-clicked submit creates a second row (M13) or updates the first. | `Idempotency-Key` header, persisted. | P2 |
| M15 | whole repo | **No outbox.** Confirmation email is sent inline inside the webhook, so email latency is inside the 300 ms acknowledgement budget, and a provider outage loses the mail silently. | `EmailOutbox` + `after()`. | P3 |
| M16 | whole repo | **No sweeper.** Pending rows never expire; a `checkout.session.expired` event is not handled; `charge.refunded` / `refund.created` are not handled. | `/api/cron/sweep`. | P3 |
| M17 | `src/lib/env.ts:13` | `ADMIN_PASSWORD` is stored and compared in plaintext. There is no `ADMIN_PASSWORD_HASH`, no lockout, and the rate limit is per-process only (M6). | Argon2/bcrypt hash, Redis-backed lockout. | P5 |
| M18 | `src/app/api/register/route.ts` | No Turnstile, no body-size limit, no rate limit on the email (only the IP). | Turnstile env-gated, size cap, per-email limit. | P2 |
| M19 | whole repo | Status enum is `pending \| paid \| refunded`. No `expired`, no `cancelled`. | Full status set + CHECK constraint. | P1 |
| M20 | whole repo | No `isInternal` flag; no way to exclude staff from public counts. | `isInternal` + partial index. | P1/P5 |
| M21 | `src/lib/auth.ts:41` | Admin cookie is `sameSite: 'lax'`; no origin check on admin POSTs. | `strict`, origin check. | P9 |
| M22 | whole repo | No `vercel.json`: no regions, no `maxDuration`, no cron. | Added. | P7 |
| M23 | whole repo | No CI at all (`.github/` does not exist). | GitHub Actions. | P11 |
| M24 | `src/app/page.tsx` | Homepage reads `paidCount()` server-side → not static, and origin hit rate is 100% instead of <1%. | Static/ISR + client-side counter. | P4 |

---

## 4. Backend Risk Register

**Correctness**

- **R1 (critical) — mat number assignment races.** `database.ts:90` is read-modify-write. Two simultaneous payments can produce duplicate assignment attempts; correctness currently depends on the unique constraint and a retry loop. Under the burst the client expects (100–300 registrations/s) this is not survivable.
- **R2 (critical) — webhook replay is not idempotent.** `WebhookEvent` is never written. Stripe retries a webhook for up to three days; each retry re-sends the confirmation email.
- **R3 (critical) — duplicate registration.** M13. Two people sharing an email, or one person double-clicking, can both be inserted.
- **R4 (high) — mock payments in production.** M5. If `STRIPE_SECRET_KEY` is ever unset on the live deploy, the site issues paid tickets for free. This is the single most damaging defect in the codebase: it is silent, it is triggered by a config mistake, and it hands out prize-eligibility without money.
- **R5 (medium) — capacity is unenforced.** Registration is uncapped and the goal is a constant, so 200,000 is a slogan rather than a control.

**Concurrency**

- **R6 (critical) — no shared rate limiter.** M6. On a multi-instance host every instance allows the full quota.
- **R7 (high) — no counter, so no atomic capacity check exists to build on.**

**Capacity**

- **R8 (critical) — `/api/stats` is uncached.** M8. This is the endpoint that takes the 2,000 rps spike.
- **R9 (critical) — homepage is per-request dynamic.** M24. Origin sees every page view.
- **R10 (high) — admin export loads the whole table.** M7. OOM at scale.
- **R11 (high) — unbounded `findMany` in aggregates.** M9, M10.
- **R12 (medium) — `count()` on a partial-indexless table.** There is no index supporting `WHERE status = 'paid'`; the schema indexes `(email)` and `(status)` separately, and neither is selective enough for a 200,000-row count.

**Security**

- **R13 (high) — plaintext admin password, no lockout.** M17.
- **R14 (medium) — no origin check on admin mutations.**
- **R15 (medium) — no retention or deletion path for personal data**, and no hash of the registrant IP.
- **R16 (low) — `Referrer-Policy`/CSP are present but report-only.** Correct for now; documented.

**Cost / operations**

- **R17 (high) — no `/api/ready`**, so a database outage cannot be distinguished from a cold start.
- **R18 (medium) — no metrics for anything.** Outbox depth, webhook lag and cache hit ratio are all invisible.
- **R19 (medium) — no CI**, so a regression in any of the above ships silently.
- **R20 (medium) — Vercel Hobby constraints.** The site takes payments, which is commercial use; Hobby is licensed for non-commercial personal use and caps cron at once daily.

---

## 5. Data model as it exists

`Registration`: `id`, `publicId` (unique), `fullName`, `email`, `mobile`, `dateOfBirth`, `cityState`, `status` (free string, default `pending`), `matNumber` (unique, nullable), `refCode` (unique), `referredBy`, `paymentProvider` (default `mock`), `paymentRef`, `consentAt`, `createdAt`, `paidAt`. Indexes on `email`, `status`, `refCode`.

`WebhookEvent`: `id` (the provider event id), `createdAt`. **Never written.**

Missing entirely: `Setting`, `SettingAudit`, `Counter`, `WaitlistEntry`, `EmailOutbox`. Missing columns: `emailNormalized`, `isInternal`, `mobileE164`, `holdExpiresAt`, `stripeSessionId`, `ipHash`, `updatedAt`.

The schema is currently `provider = "sqlite"`, switched at install time by `scripts/set-db-provider.mjs`. There is no migration directory, so nothing has ever been migrated — the schema is applied with `db push`.

---

## 6. What the reports claim versus what the code does

| Report claim | Reality |
|---|---|
| `BUILD_REPORT.md`: "the demo runs with no database" | True, and it is now the **production default** too — `.env.example` sets `DATABASE_URL="file:./dev.db"`, which is not a Postgres URL, so `getStore()` returns the memory store. A deploy that copies `.env.example` verbatim loses every registration. |
| `BUILD_REPORT.md`: idempotent webhook handling | **Not implemented.** M4. |
| `src/app/api/webhooks/stripe/route.ts:36`: "a replayed event returns 200 without doing the work twice" | The comment is duplicated at lines 35 and 36 and describes behaviour that does not exist. |
| `src/lib/payments/index.ts:4`: "mock (the default, so the site runs with zero credentials)" | True, and it is not restricted to development. R4. |
| `src/lib/counter.ts:12`: "Mock registrations are excluded upstream by the store" | **False.** No store excludes anything; `countPaid()` counts every row with `status = 'paid'`. The comment is load-bearing for the honesty of the public number and is untrue. |
| `src/lib/db.ts:14`: "Prisma 7 requires an explicit driver adapter" | True. |
| `.env.example`: "Leave blank for the mock provider… A production deployment on the mock provider shows a persistent 'payments are simulated' banner" | A banner existed and was **removed on request** (commit `dfe48a0`, and the owner has previously asked for it to stay removed). The docs were never updated. |

---

## 7. Environment variables

Currently read: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SEED_DEMO`, plus `NEXT_PUBLIC_STRIPE_ENABLED`, `NEXT_PUBLIC_COUNTER_MIN_PUBLIC`, `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_SAFETY_FAQ_APPROVED`, `NEXT_PUBLIC_CONTACT_*`, `NEXT_PUBLIC_SPONSOR`, `NEXT_PUBLIC_CONTEST_DEADLINE`, `NEXT_PUBLIC_INSTAGRAM/TIKTOK/X`, `GEMINI_API_KEY`.

**Every one of them is optional.** There is no startup validation, so a production deploy missing its database URL starts cleanly and then loses data.

Required in production after this work: `DATABASE_URL` (pooled Postgres), `DIRECT_URL` (migrations), `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` (https), `CRON_SECRET`. Optional and env-gated: `UPSTASH_*` or `REDIS_URL`, `TURNSTILE_*`, `SENTRY_DSN`, `MOCK_PAYMENTS`.

---

## 8. Phase 0 conclusion

The UI is in good shape and should be preserved. The backend is a working demo that has been described in its own comments as production-ready. It is not: under the client's own traffic model it would lose registrations, double-email on every webhook retry, hand out free tickets on a misconfigured deploy, and exhaust memory on the first CSV export.

The single most urgent defect is **R4**. Everything else degrades; that one takes money and gives away prize eligibility.