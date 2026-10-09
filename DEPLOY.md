# DEPLOY.md

> **Read this before any real launch.** The site builds and starts with zero
> configuration, and in production it **refuses to** if it is not correctly
> configured. That is deliberate: the two failure modes below cost money, and
> both are invisible if the site is allowed to start anyway.

1. **Without a PostgreSQL `DATABASE_URL`, the server throws on first request.**
   There is no in-memory or SQLite fallback any more. A site that takes money
   cannot depend on which host it landed on.
2. **Without Stripe keys in production, the site issues no tickets** and serves a
   waitlist instead, saying so in `/api/health` and on the page. The previous
   build fell through to a mock provider and handed out paid tickets for free;
   that path is now unreachable in production regardless of configuration.

Check `/api/health` after deploying. It returns `503` with a `problems` array
while anything is wrong, so it can be wired straight into an uptime monitor.

---

## 1. Which plan you need — and the two things Hobby blocks

**The project is currently on Hobby. Two things break there, both discovered by
actually running `vercel deploy`:**

### 1a. A per-minute cron is rejected outright

```
Error: Hobby accounts are limited to daily cron jobs.
This cron expression (* * * * *) would run more than once per day.
```

`vercel.json` therefore ships **without** a `crons` block, so the build succeeds.
On Pro, add it back:

```json
"crons": [{ "path": "/api/cron/sweep", "schedule": "* * * * *" }]
```

### 1b. Without the cron, the work still has to happen

The sweeper is not optional. Without it, confirmation emails queue in the outbox
and never send, and holds that are never expired permanently consume capacity
until the cap drifts down and registration refuses everyone.

So the work is **also triggered by ordinary traffic** — see `src/lib/tick.ts`.
Every registration and every webhook fires a background tick, rate limited to
once a minute by a Redis lock, and it is safe to do that because every job it
runs was already idempotent: outbox rows are claimed with `FOR UPDATE SKIP
LOCKED`, hold expiry only matches rows still `pending`, and reconciliation
recomputes from the source table rather than adjusting a delta.

**What that is not:** a real scheduler. A cron ticks when traffic is zero; this
cannot. On a quiet site, outbox work waits for the next visitor. Fine for a
contest with traffic, not fine for launch.

### 1c. The licence point, which outranks all of the above

| | Vercel Hobby | Vercel Pro | Self-hosted |
|---|---|---|---|
| Commercial use — this site takes money | **No** | Yes | Yes |
| Per-minute cron | No (daily only) | Yes | Yours |
| Verdict | **Not permitted for this site** | **Required before launch** | Supported |

Hobby is licensed for **non-commercial personal use**. This site processes
payments, so the licence does not cover it regardless of the technical limits.
Pro is the minimum for a commercial launch, and a self-hosted droplet is the
alternative.

---

## 2. What you need provisioned

| Service | Provider examples | Notes |
|---|---|---|
| PostgreSQL | Neon, Supabase, Railway, Render | Needs a **pooled** URL for runtime and a **direct** URL for migrations |
| Redis | Upstash (serverless), or Redis on the same host | Not required to boot, but rate limits become per-instance without it |
| Stripe | stripe.com | Live keys plus a webhook endpoint |
| Email | Resend | Verify the sending domain with SPF, DKIM and DMARC |
| Turnstile | Cloudflare | Optional; recommended before a launch |
| Error tracking | Sentry | Optional |

Full variable list with explanations: `.env.example`.

---

## 3. Vercel

```bash
vercel link
vercel env pull .env.local        # or set them in the dashboard
npm run db:migrate                 # applies migrations once, before serving
vercel --prod
```

### Migrations in the release step

Migrations must run **before** the new code serves traffic, never at request
time. `package.json` has `"db:migrate": "prisma migrate deploy"` for this.

### Post-deploy checks

```bash
curl -s https://your-domain/api/health | jq     # expect status: "ok"
curl -s https://your-domain/api/ready  | jq     # expect ready: true
curl -sI https://your-domain/api/stats           # expect s-maxage=15
```

### The sweeper on a plan without cron

If you are on Hobby, the traffic-triggered tick keeps things moving while there
is traffic. To get a guaranteed tick when there is none, point any external
scheduler at the endpoint — GitHub Actions, cron-job.org, or a container cron:

```bash
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/sweep
```

### Regions

`vercel.json` sets `regions: ["iad1"]`. **Set this to your database's region.**
Every database route runs on the Node.js runtime and holds a PostgreSQL
connection, so function placement is the largest latency lever available:
beside the database a network round trip is about 1 ms instead of about 40 ms.
Beside the visitor is the wrong trade for this app.

### Migrations are forward-only

There are no down migrations. Rolling the code back against a newer schema is
safe here because every column added in this work is additive, but deploy
forward if in doubt.

---

## 4. Self-hosting (DigitalOcean or equivalent)

Sizing: the origin is not the bottleneck — the database is. 2 vCPU / 4 GB for the
app, and a managed database rather than a container on the same box.

```bash
# 1. Build
docker build -t sleep-contest .

# 2. Migrate (before the app serves traffic)
docker run --rm --env-file .env.production sleep-contest npm run db:migrate

# 3. Run
docker run -d --name sleep-contest \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  sleep-contest
```

Put Caddy or nginx in front for TLS, and schedule the sweeper:

```cron
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/sweep
```

`vercel.json` carries the equivalent configuration for Vercel.

---

## 4a. Preview deployments (no database)

If you want a deployment that renders and can be clicked through **before**
anyone provisions PostgreSQL, set:

```
PREVIEW_MODE=true
```

That seeds a sample dataset into a SQLite file under `/tmp` and serves the site
from it. Everything renders: the counter, the world section, the record-attempt
badge, the admin views.

**What it will not do**, deliberately:

| Path | Behaviour |
| --- | --- |
| `POST /api/register` | 503, "This is a preview deployment" |
| `POST /api/checkout` | 503, "This is a preview deployment" |
| `POST /api/webhooks/stripe` | 503, not processed |
| `GET /api/health` | `previewMode: true`, and listed under `problems` |

That is the whole point. A preview must never be mistaken for the live site, and
it must never be able to take a payment or hand out a ticket. The rule "a
production deployment must never issue a ticket without payment" is not
something this mode is allowed to weaken.

**Engagement is conjunctive:** `PREVIEW_MODE=true` **and** no PostgreSQL
`DATABASE_URL`. If both are set, PostgreSQL wins and a warning is logged, so a
stale flag can never override a real database.

Verified end to end against a production build with no database: the home page
renders with 719 seeded registrations, 3 world cards and 2 badges; register
returns 503 with the preview message; health reports `previewMode: true`.

```bash
PREVIEW_MODE=true DATABASE_URL= DIRECT_URL= REDIS_URL= NODE_ENV=production \
  npx next start
```

**Not suitable for the live site.** The SQLite file lives in `/tmp`, is wiped on
every cold start, and is not shared between instances. It is for review, for a
pull request preview, and for showing the client what the site looks like with
data in it. Everything else on this page still applies.

## 5. Stripe

1. Create a **Product** and a **Price**. Set `STRIPE_PRICE_CENTS` to match the
   price in cents.
2. Add a webhook endpoint at `https://your-domain/api/webhooks/stripe`.
3. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `charge.refunded`
   - `refund.created`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Verify it is working:

```sql
SELECT type, status, count(*) FROM "WebhookEvent"
  WHERE receivedAt > now() - interval '1 hour' GROUP BY 1, 2;
```

`status = 'failed'` means processing failed; `lastError` says why. Stripe retries
for three days, so an outage here is rarely urgent — but every non-2xx makes the
queue longer, so check it anyway.

---

## 6. Email

1. Verify the sending domain in Resend (SPF, DKIM, DMARC).
2. Set `RESEND_API_KEY` and `EMAIL_FROM`.
3. Send a test registration and confirm delivery.

Without these, confirmations queue in the outbox and never arrive.
`/api/health` reports that as degraded rather than pretending mail was sent.

---

## 7. First-launch checklist

- [ ] `GET /api/health` returns `"status": "ok"` with an empty `problems` array
- [ ] `GET /api/ready` returns `"ready": true`
- [ ] A test registration reaches "paid" and the ticket page renders
- [ ] The confirmation email arrives, and the link in it works
- [ ] `providers.payments` is `stripe`, not `none`
- [ ] `/api/stats` returns `Cache-Control: public, s-maxage=15`
- [ ] The capacity counter agrees with the registrations table:
      `SELECT reserved FROM "Counter"` against
      `SELECT count(*) FROM "Registration" WHERE status IN ('pending','paid')`
- [ ] A test refund moves the status to `refunded` and releases the seat
- [ ] `/api/cron/sweep` returns 200 (check the Vercel cron log)
- [ ] The admin health card shows a non-zero outbox depth that drains
- [ ] Turnstile keys are set, or you accept rate limits as the only bot defence
- [ ] A promotions lawyer has reviewed the paid-entry structure — see
      `CLIENT_INPUTS_NEEDED.md` §13

---

## 8. The environment file and `$`

The admin password hash is **dot-separated** (`scrypt.N.r.p.salt.hash`) rather
than the conventional dollar-separated form.

This is not cosmetic. A `.env` file is shell-flavoured: `source .env`,
`set -a; . .env.local`, Docker's `env_file` and systemd all expand `$1` and `$8`
as shell parameters and delete them. A dollar-separated hash arrives at the
server truncated, with no error anywhere, and the admin password simply never
works. Base64 cannot contain a dot, so this format survives every loader.

`tests/integration/admin-auth.test.ts` writes a hash to a file, sources it with
bash, and asserts it comes back unchanged.

---

## 9. Rolling back

```bash
vercel rollback
```

Migrations are not reversed. See §3.