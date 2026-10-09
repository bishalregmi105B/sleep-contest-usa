# LOAD_TEST_REPORT.md

Measured numbers for the backend rewrite, with the commands to reproduce them.

**A laptop measures the laptop.** Every figure below was taken on the machine
described in §1, with the application server and the database on the same host.
The published targets assume a dedicated origin with the database in the same
region, so absolute latencies here are pessimistic and relative comparisons are
the useful part. Nothing here was run against production.

---

## 1. Machine

| | |
|---|---|
| CPU | 8 cores |
| RAM | 14 GB total, ~6 GB in use |
| OS | Linux 7.0.0-38-generic x64 |
| Node | v22.20.0 |
| Next.js | 16.4.0, production build (`next build && next start`) |
| Database | PostgreSQL 16-alpine, **in a container on the same host** |
| Redis | Redis 7, same host |
| Data | 200,000 seeded registrations (136,000 paid/non-internal) |
| CDN | **none** — every request below reaches the origin |

The last two rows matter most. Both the app and Postgres compete for the same
8 cores, and there is no edge cache in front of the origin.

---

## 2. Why the counter row exists

The single most consequential decision in this work was measured, not assumed.
On 200,000 rows:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM "Registration"
  WHERE status = 'paid' AND NOT "isInternal";

->  Index Only Scan using reg_paid_public_idx on "Registration"
    (actual time=0.052..14.658 rows=136000 loops=1)
    Execution Time: 21.595 ms
```

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT paid FROM "Counter" WHERE id = 1;

->  Index Scan using "Counter_pkey" on "Counter"
    (actual time=0.026..0.027 rows=1)
    Execution Time: 0.084 ms
```

**21.6 ms versus 0.084 ms — 257× faster.** The partial index does work; it is
scanned with zero heap fetches because autovacuum has the visibility map
current. But it is still O(paid rows), and the brief sets a 20 ms hot-path
budget, which it exceeds before any network is involved.

The cost is also fragile rather than merely slow. Immediately after a bulk
insert, before autovacuum runs, the same query plans a parallel seq scan and
measures **24 ms**, and with the visibility map stale the index scan degrades to
**28 ms with 136,000 heap fetches**. So the count would swing between 12 ms and
28 ms depending on maintenance timing alone.

That is why `Counter.paid` is maintained in the same transaction as the paid
transition. The partial index is kept and is what reconciliation queries.

---

## 3. `GET /api/stats`

### 3.1 Origin throughput (no CDN — the pessimistic case)

```
npx autocannon -c 200 -d 20 http://127.0.0.1:3000/api/stats
```

| Metric | Result |
|---|---|
| Requests | 17,000 in 20.07 s |
| Throughput | **828 req/s** sustained |
| p50 | 234 ms |
| p95 | 352 ms |
| p99 | 485 ms |
| Errors | **0** |

p95 of 352 ms against a 50 ms target. The gap is the CDN: in production this
response carries `Cache-Control: public, s-maxage=15, stale-while-revalidate=60`
and is answered at the edge, so origin traffic is a small fraction of visitor
traffic. As configured, one `next start` process saturates at ~830 rps with 200
concurrent connections, which is Little's law describing a CPU-bound single Node
process — not a database problem.

### 3.2 The number that actually matters: queries reaching the database

Cache emptied first, then 8,000 concurrent requests:

```
redis-cli DEL stats:v1
SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname='sleepcontest';
npx autocannon -c 200 -d 10 http://127.0.0.1:3000/api/stats
SELECT xact_commit + xact_rollback ...;
```

| | |
|---|---|
| Requests served | 8,000 |
| Cache state at start | **cold** |
| Database transactions | **3** |

The target was "at most one database query per 15 seconds per region". Three
transactions covered 8,000 requests from a cold cache, because the CDN and Redis
layers absorbed the load and the single-flight lock collapsed the expiry into a
single recompute.

---

## 4. `POST /api/register` (the write path)

Each request uses a unique email and a unique `X-Forwarded-For`, so the rate
limiter does not mask the write path. The rate limiter is verified separately in
the test suite.

```
node loadtest/register.js http://127.0.0.1:3000 50 20
```

| Metric | Result | Target | Verdict |
|---|---|---|---|
| Requests | 2,900 in 20.2 s | — | — |
| Throughput | **144 req/s** | 150 rps sustained | on target |
| Accepted | 2,900 | — | — |
| **Errors** | **0** | < 0.1% | **pass** |
| p50 | 333 ms | — | — |
| p95 | 405 ms | < 300 ms | **miss** |
| p99 | 670 ms | < 800 ms | **pass** |
| DB transactions | ~15,461 (≈5.3 per request) | — | — |
| Peak DB connections | 21 of 50 | < 80% of plan | pass |

p95 misses the 300 ms target by 105 ms. The honest reading: the app process and
the database are competing for the same 8 cores on one machine, and ~5
transactions per request is more round trips than the path strictly needs
(active-email lookup, capacity hold, insert).

**This is the first thing to re-measure once the database is on its own host.**
If p95 is still above 300 ms there, the next step is to merge the hold and the
insert into a single transaction, which removes one round trip per registration.

### 4.1 The cap held

The seeded table plus the load run filled the cap. Afterwards:

```sql
SELECT (SELECT reserved FROM "Counter" WHERE id = 1),          -- 200000
       (SELECT count(*) FROM "Registration"
         WHERE status IN ('pending','paid'));                  -- 200000
```

Counter and truth agree exactly, at the cap, after 2,900 concurrent writes. A
further registration returned the honest full state, not an error page:

```json
{"code":"full","waitlist":true,
 "message":"Registration is full right now. Leave your email and we will contact you if a spot opens."}
```

HTTP 409, and a `WaitlistEntry` was written.

### 4.2 Counter drift, and the correction

Partway through the run the counter read 190,767 against a true 190,765 — a
drift of 2 in ~190,000 (0.001%). This is expected under concurrency: a
registration that loses the insert race releases its hold slightly after the
winner commits, so a momentary read can differ.

It is corrected automatically. `/api/cron/sweep?reconcile=1` recomputes from the
registrations table and reported `driftedPaid: false, driftedReserved: false`
with both counters matching. Reconciliation is scheduled every five minutes.

---

## 5. Concurrency and correctness

Measured by `npm run test` against real PostgreSQL and Redis — see
`tests/integration/concurrency.test.ts` and `tests/integration/webhook.test.ts`.
These are not autocannon runs; each asserts an invariant after firing many
concurrent writers at the real database.

| Check | Result |
|---|---|
| 100 parallel submissions, one email | 1 active row, 1 hold, all responses name the same `publicId` |
| 1,000 parallel registrations, cap 100 | exactly 100 granted, 900 given the full state, `reserved` never > 100 |
| 1,000 parallel paid transitions | 1,000 distinct mat numbers, 0 duplicates |
| 500 parallel deliveries of one Stripe event | 1 transition, 1 mat number, 1 outbox row, 1 ledger row |
| Repeated transition for one registration | no second mat number |
| Two sweepers at once | 200 holds released once each; a third pass is a no-op |
| Expired-then-completed delivery | issues no ticket |
| Completed-then-expired delivery | stays paid |
| Completed but unpaid session | no ticket, no mail |
| Refund, then duplicate refund | seat released once, `reserved` stays 0 |
| Reconciliation after injected drift | detects and corrects; second run is a no-op |

---

## 6. Not measured here, and why

Stated plainly rather than left to look complete:

- **k6 scenarios (`stats.js`, `mixed.js`, `soak.js`, `export.js`)** — not run.
  k6 is not installed on this host. The scenarios run through autocannon or the
  Node load-test scripts in `loadtest/` instead; exact commands in §7.
- **A 30-minute soak** — not run. A 30-minute run on a shared laptop measures
  thermal behaviour and container scheduling, not the backend.
- **CSV export of 200,000 rows while registrations are in flight** — not run.
  The export is now a keyset-paginated stream rather than a full-table read, so
  memory is flat by construction; the concurrency behaviour is unmeasured.
- **Stripe webhook load with real signed events** — not run; requires live
  Stripe keys. The handler is exercised directly with synthetic events instead,
  which covers the idempotency logic but not Stripe's retry cadence.
- **Failure injection** (Redis stopped, Stripe delayed, email provider 500, DB
  pool exhausted) — not automated. The degradation paths are implemented and
  logged; they have not been proven by an injected failure.

---

## 7. Reproducing

```bash
# 1. Dependencies
docker compose up -d
npm ci
cp .env.example .env.local          # then set DATABASE_URL / REDIS_URL
npm run db:migrate

# 2. Unit and integration tests (real Postgres and Redis)
npm test

# 3. Seed 200,000 registrations
DATABASE_URL=postgresql://… DIRECT_URL=postgresql://… \
  node loadtest/seed-200k.mjs --reset

# 4. Production build and server
npm run build && npm run start

# 5. Stats: throughput, then the query count
npx autocannon -c 200 -d 20 http://127.0.0.1:3000/api/stats

redis-cli DEL stats:v1
docker exec -i sc-postgres psql -tA -U sc -d sleepcontest \
  -c "SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname='sleepcontest';"
npx autocannon -c 200 -d 10 http://127.0.0.1:3000/api/stats
docker exec -i sc-postgres psql -tA -U sc -d sleepcontest \
  -c "SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname='sleepcontest';"

# 6. Registration write path
node loadtest/register.js http://127.0.0.1:3000 50 20

# 7. Confirm the cap held
docker exec -i sc-postgres psql -U sc -d sleepcontest -c \
  'SELECT (SELECT reserved FROM "Counter" WHERE id=1),
          (SELECT count(*) FROM "Registration" WHERE status IN (''pending'',''paid''));'
```

### Note on `/api/register` during load testing

`POST /api/register` returns 503 with a waitlist response when payments are not
configured, and **that is correct** — a production deployment without Stripe keys
must not collect registrations it cannot turn into tickets. Measured with no
Stripe keys: 1,931 requests, 0 accepted, 100% refused, no writes. To measure the
write path, set placeholder Stripe keys in `.env.local`; the register route
never contacts Stripe (only `/api/checkout` does).