# Demo notes

## It runs with nothing

No database, no `.env`, no configuration:

```bash
npm install
npm run dev
```

Deploy it and it works. That is the point of the in-memory store: a hosted
platform has an ephemeral filesystem, so a file database silently loses every
registration, and a managed database has to be provisioned before anything can
be shown. Neither is worth the friction for a demo.

## What works end to end

Register on the site, pay the $10 (the mock provider completes instantly), land
on the boarding-pass ticket, share the referral link, check the leaderboard at
`/friends`, and see everything in `/admin`. Validation, the 18+ rule, the
honeypot, duplicate detection and the rate limits are all real.

## The one thing to know

In-memory state lives in the process. It is shared between requests handled by
the same instance and **resets when that instance restarts** — which on a
serverless host means redeploying, or a cold start, clears it. On a serverless
platform each request may also land on a different instance, so registrations
made a moment apart may not see each other.

That is fine for showing the flow and not fine for taking real money. Set
`DATABASE_URL` to a PostgreSQL connection string and the same code persists
properly; see `DEPLOY.md`.

## Payments and email are mocked

Checkout completes instantly and no money moves. Confirmation emails print to the
terminal rather than being sent. Both switch to Stripe and Resend the moment
their keys are in the environment, with no code change.

## Admin

Set `ADMIN_PASSWORD` and `SESSION_SECRET` to reach `/admin`. Without them the
page says so rather than failing.
