# Deploying

> **Read this before any real launch.** The site runs with zero configuration and
> that is genuinely useful for a demo. Two of those defaults are actively wrong
> for a live contest, and both of them fail quietly: the site keeps looking
> correct while quietly losing data or quietly taking no money.
>
> 1. **Set `DATABASE_URL` to a managed PostgreSQL database.** The default
>    in-memory store lives in a single server instance. It resets on every
>    redeploy and, on a serverless host, two requests can see different
>    registration counts. Nothing errors. The number on the page is just wrong.
> 2. **Set the Stripe keys and `NEXT_PUBLIC_STRIPE_ENABLED=true`.** Without
>    both, the deployment runs the mock provider: it completes instantly, takes
>    no money and issues no real ticket, while looking completely normal to a
>    visitor.
>
> Check `/api/health` after deploying. It returns `503` with a `problems` array
> while either of those is true, so it can be wired straight into an uptime
> monitor.

## Why SQLite does not work in production

`DATABASE_URL="file:./dev.db"` is perfect for local development and for showing a
demo. It will not survive a hosted deploy: serverless platforms such as Vercel
have an ephemeral, read-only filesystem, so every registration is written into a
throwaway container and lost. A build will succeed and the site will look fine —
registrations will simply not persist.

Use a managed PostgreSQL database for anything real. Vercel Postgres, Neon,
Supabase and Railway all work.

## 1. Database

```bash
# Point DATABASE_URL at the managed database, then:
npm run db:push
```

`db:push` switches the Prisma datasource provider to match the URL and applies
the schema. It is the right command for a new database; use `npm run db:migrate`
when you want versioned migrations instead.

Then confirm the count survives a restart — the check that actually matters:

```bash
curl -s localhost:3000/api/stats        # note the count
# redeploy or restart the process
curl -s localhost:3000/api/stats        # the count must be unchanged
```

If it changed, the store is still in-memory. Check that `DATABASE_URL` is set in
the deployment environment and not only in a local `.env`.

## 2. Payments

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `NEXT_PUBLIC_STRIPE_ENABLED=true`.

`NEXT_PUBLIC_STRIPE_ENABLED` is deliberately separate from the secret keys: it is
a public flag, and setting it without the keys would make the page claim a
processor it is not using. While the mock provider is active in production the
page shows a persistent banner saying so, so nobody can mistake a preview for a
paid registration.

Point the Stripe webhook at `/api/webhooks/stripe` and subscribe it to
`checkout.session.completed`.

## 3. Email

Set `RESEND_API_KEY` and `EMAIL_FROM`. Without them, confirmation emails print
to the server log and nobody receives a ticket link — the registration succeeds
and the entrant has no ticket.

`NEXT_PUBLIC_SITE_URL` must be `https` and correct before email goes out, because
it is what the ticket link in every confirmation is built from.

## 4. Everything else is optional

The site runs without any of this: a build succeeds with no environment at all,
and `npm run assets:scan` finding nothing is a valid state, not an error. The
in-memory store, the mock payment provider and the console email provider each
exist so the demo works on first deploy.

## Environment variables

| Variable | Required to launch | What it does |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Managed PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | **Yes** | Live payments |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Verifies the Stripe webhook |
| `NEXT_PUBLIC_STRIPE_ENABLED` | **Yes** | Tells the page a real processor is in use |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | `https` origin for canonicals, OG and ticket links |
| `RESEND_API_KEY` | **Yes** | Real confirmation emails |
| `EMAIL_FROM` | **Yes** | Verified sending address |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Shown as a `mailto:` in the footer |
| `NEXT_PUBLIC_CONTACT_PHONE` | No | Shown as a `tel:` link |
| `NEXT_PUBLIC_ORGANIZER_ADDRESS` | No | Postal address in the footer |
| `NEXT_PUBLIC_CONTEST_DEADLINE` | No | Appears in the refund policy once set |
| `NEXT_PUBLIC_SPONSOR` | No | Adds "Presented by …" to the prize section |
| `NEXT_PUBLIC_COUNTER_MIN_PUBLIC` | No | Threshold below which the counter hides its number (default 500) |
| `NEXT_PUBLIC_SAFETY_FAQ_APPROVED` | No | Publishes the safety and biometric-data FAQ |
| `NEXT_PUBLIC_INSTAGRAM` / `_TIKTOK` / `_X` | No | Footer social links, rendered only if set |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | No | Enables `/admin` |
| `GEMINI_API_KEY` | No | Lets `npm run images:generate` write the photographs |

Unset content variables are **hidden**, never rendered as a placeholder, so a
production page cannot show a square bracket or a literal `undefined`.

## Font self-hosting

The build makes no network call. `next/font/google` previously fetched from
`fonts.googleapis.com` during the build, and an unparseable response from that
host killed a real deploy with "next/font/google queries have exactly one
entry". The three families are downloaded once by `scripts/fetch-fonts.mjs` and
committed under `src/app/fonts/`.

## A 404 on Vercel has two causes, in this order

1. **Deployment protection.** Vercel hides a production deployment behind a
   password until you turn it off in Settings → Deployment Protection. A 404
   from a protected project is Vercel, not the site.
2. **Framework preset set to "Other".** That serves `public/` and nothing else.
   Set the preset to Next.js.