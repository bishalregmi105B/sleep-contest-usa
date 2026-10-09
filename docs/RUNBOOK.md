# RUNBOOK.md

What to do when something is wrong. Ordered by how likely each is to happen.

The first step in every incident is the same: **`GET /api/health`**. It reports
which providers are configured, whether the database answers, and lists the
problems it found. It leaks no configuration values — presence only.

---

## 1. Read the health endpoint

```bash
curl -s https://your-domain/api/health | jq
```

| Field | Meaning |
|---|---|
| `status: "degraded"` | A provider the site expects is not in use. **This is the field to alert on.** |
| `databaseReachable` | False means nothing works. |
| `providers.payments` | `none` means no tickets will be issued, by design. |
| `providers.redis` | `memory` means rate limits are per-instance. |
| `problems[]` | Plain-language list. Start at the top. |

---

## 2. Traffic spike

**Symptoms:** p95 latency climbing, `/api/ready` returning 503, 503s from
`/api/register`.

1. **Check the origin is still being hit at all.** This is the number that
   decides everything else:
   ```bash
   # Vercel: Analytics, or
   curl -s https://your-domain/api/stats -o /dev/null -w '%{time_total}\n'
   ```
   If `/api/stats` is slow but the site is fine, the CDN is doing its job and
   nothing is wrong.

2. **Check database connections.** Never above 80% of the plan:
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'your_db' GROUP BY state;
   ```
   If you are near the limit on serverless, the pooled `DATABASE_URL` is missing
   `connection_limit=1`. Every instance opens its own pool otherwise.

3. **Raise the cap or close registration.** From `/admin`:
   - Raise `maxRegistrations` (takes effect within 15 seconds).
   - Or flip `registrationOpen` to false, which shows a closed state and returns
     403 cleanly. The waitlist keeps collecting email addresses.

   **Raising the cap is usually the right call.** Closing registration during a
   spike throws away demand at the moment you have it.

4. **Confirm the cap held:**
   ```sql
   SELECT reserved FROM "Counter" WHERE id = 1;
   SELECT count(*) FROM "Registration" WHERE status IN ('pending','paid');
   ```
   These must be equal. If they are not, force reconciliation:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-domain/api/cron/sweep?reconcile=1"
   ```

5. **Watch the counters** in the log stream: `register accepted`,
   `registration refused: capacity full`, `webhook: registration paid`,
   `outbox: dead`.

---

## 3. Database saturated or down

**Symptoms:** `/api/ready` 503, `databaseReachable: false`, 503s everywhere.

1. **Is it reachable?** `/api/ready` checks the connection, not the schema.
2. **Are we out of connections, or out of CPU?**
   ```sql
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   SELECT now(), query_start, left(query, 120) FROM pg_stat_activity
     WHERE state = 'active' ORDER BY query_start LIMIT 10;
   ```
3. **Slow query?** Enable and read the statistics:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   SELECT calls, mean_exec_time, left(query, 100) FROM pg_stat_statements
     ORDER BY mean_exec_time DESC LIMIT 10;
   ```
   The public counter query should be an **index-only scan** on
   `reg_paid_public_idx` with zero heap fetches. If it is a sequential scan,
   autovacuum has not run:
   ```sql
   VACUUM (ANALYZE) "Registration";
   ```

4. **Partial outage?** The site degrades rather than fails: `/api/stats` falls
   back to the database if Redis is gone, and registration keeps working. If the
   database itself is gone, nothing works and returning 503 with `Retry-After`
   is correct.

---

## 4. Stripe outage

**Two different failures. Check which one.**

### At checkout (visitor is on the page)

The registration is saved and its hold is intact. The visitor is told the truth,
and a "complete your payment" email is queued. Nothing is lost.

```bash
curl -s https://your-domain/api/health | jq .providers.payments
```

### Webhooks not arriving

Stripe retries for three days, so this is usually not urgent, but check:

1. **Is the endpoint secret current?** A rotated `STRIPE_WEBHOOK_SECRET` makes
   every event fail verification:
   ```bash
   curl -s https://your-domain/api/health | jq .secretsConfigured.stripeWebhook
   ```
2. **Are we returning 2xx?** Non-2xx makes Stripe keep retrying:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/api/health
   ```
3. **Are events being recorded?**
   ```sql
   SELECT type, status, count(*) FROM "WebhookEvent"
     WHERE receivedAt > now() - interval '1 hour' GROUP BY 1, 2;
   ```
   `status = 'failed'` rows mean processing failed; `lastError` says why.

### Payments not configured at all

`providers.payments: "none"` means **the site issues no tickets and serves a
waitlist instead.** This is deliberate. A production deployment missing its
Stripe keys used to hand out paid tickets for free; the current build cannot.

---

## 5. Email not arriving

1. **Is it configured?** `/api/health` → `providers.email`.
2. **Is it stuck in the outbox?**
   ```sql
   SELECT status, count(*) FROM "EmailOutbox" GROUP BY status;
   SELECT * FROM "EmailOutbox" WHERE status = 'dead' ORDER BY "createdAt" DESC LIMIT 10;
   ```
3. **Drain it manually** (safe to run while cron is running — rows are claimed
   with `FOR UPDATE SKIP LOCKED`, so the two take disjoint sets):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/sweep
   ```
4. **Backoff:** attempts at 1 min, 5 min, 30 min, 2 h, 12 h, then `dead`.
   `dead` rows are visible in admin and need a human.
5. **Resend bounces:** a message that failed delivery is *not* silently marked
   sent. The provider's error is thrown, and the row is retried.

---

## 6. Changing the cap or milestones

From `/admin` → Settings. Both take effect within 15 seconds.

- Every change is written to `SettingAudit` with the admin id, the old and new
  value, and a hashed IP.
- The public counter cache is invalidated immediately on the instance that wrote
  it, and expires within 15 seconds everywhere else.
- `maxRegistrations` cannot be set below `goal`. Lower the goal first.
- Milestones must strictly increase and the last must equal the goal.
- The Guinness badge **cannot be enabled** without a written approval reference
  and a date. This is enforced server-side, not just in the form.

---

## 7. Refunding someone

1. **Find the registration** in `/admin` by name or email.
2. **Refund in Stripe.** Do not edit the database.
3. Stripe sends `charge.refunded`; the webhook sets the status and releases the
   capacity. The seat goes back into the pool automatically.
4. **Confirm:**
   ```sql
   SELECT status, "matNumber" FROM "Registration" WHERE "publicId" = '...';
   SELECT reserved, paid FROM "Counter" WHERE id = 1;
   ```
5. If the webhook did not arrive, resend it from Stripe's dashboard. The
   transition is guarded on `status = 'paid'`, so replaying is safe.

---

## 8. Rollback

```bash
vercel rollback                      # previous deployment
```

Migrations are **not** rolled back automatically. Prisma has no down
migrations; rolling back the code against a newer schema is safe here because
every new column is additive. Deploy forward rather than back if in doubt.

---

## 9. Someone wants their data deleted

`/admin` → registrants → **Delete or anonymise**.

- **Anonymise** (default): replaces the name, email, mobile and city, clears the
  hashed IP. Keeps the mat number and the paid count intact, so the public
  total does not change and the entrant's ticket record still exists.
- **Delete**: removes the row. **Refused for a paid registration**, because that
  would silently change the public counter and leave a paid entrant with no
  ticket.

Pending and expired registrations older than 7 days are removed automatically by
the retention job.

---

## 10. Escalation order

1. `/api/health`, then `/api/ready`
2. Log stream, filtered on `level=error`
3. `pg_stat_activity` and `pg_stat_statements`
4. Stripe dashboard → Webhooks → recent deliveries
5. Resend dashboard → logs

Every log line is a JSON object with a `requestId`. A visitor reporting a
problem should be asked for the `x-request-id` from their response headers; it
is not personal data, and it traces their request exactly.