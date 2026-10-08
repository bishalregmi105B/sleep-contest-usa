# Deploying

The site runs locally with zero setup. Deploying it needs one real decision: **which
database**, because a hosted platform cannot use the local SQLite file.

## Why SQLite does not work in production

`DATABASE_URL="file:./dev.db"` is perfect for local development and for showing a
demo. It will not survive a hosted deploy: serverless platforms such as Vercel have
an ephemeral, read-only filesystem, so every registration is written into a
throwaway container and lost. A build will succeed and the site will look fine —
registrations will simply not persist.

Use a managed PostgreSQL database for anything real. Vercel Postgres, Neon,
Supabase and Railway all work.

## Vercel

```bash
# 1. Point the schema at PostgreSQL. The provider has to match the database.
npm run db:use-postgres
npx prisma generate

# 2. Create the database and take its connection string, then set it in Vercel
#    under Settings -> Environment Variables.
#    DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# 3. Commit the provider change and deploy.
git add -A && git commit -m "build: target PostgreSQL for deployment"
```

Add these environment variables in Vercel:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The managed Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` |
| `ADMIN_PASSWORD` | A long random password |
| `SESSION_SECRET` | A long random string, e.g. `openssl rand -base64 48` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Your contact address |
| `NEXT_PUBLIC_CONTEST_DEADLINE` | Leave empty until the client sets one |
| `NEXT_PUBLIC_SPONSOR` | Leave empty until the client names one |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Only when going live with Stripe |
| `RESEND_API_KEY` / `EMAIL_FROM` | Only when sending real email |

Create the tables in the hosted database:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

`postinstall` runs `prisma generate` automatically, and it does **not** require
`DATABASE_URL` to be present, so the dependency install step succeeds on Vercel
even where that variable is only available later.

To go back to local SQLite development:

```bash
npm run db:use-sqlite
npx prisma generate
```

## Other platforms (DigitalOcean Ubuntu, any VPS)

```bash
npm install
npm run db:use-postgres
npx prisma generate
export DATABASE_URL="postgresql://user:password@host/db"
npx prisma migrate deploy     # or: prisma db push, for a first run
npm run build
npm start                     # behind Nginx with TLS, under PM2 or systemd
```

Long-cache `/_next/static` and `/assets`, and enable gzip or brotli.

## Before going live

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real origin, so canonicals and the
      sitemap point at the right domain.
- [ ] `ADMIN_PASSWORD` and `SESSION_SECRET` replaced with real random values.
- [ ] Review the CSP report-only header, then switch it to `enforce` in
      `next.config.ts`.
- [ ] Stripe and Resend keys added if using the real providers.
- [ ] The client's promotions lawyer has reviewed the rules, refund and privacy
      pages. They are drafts and say so.
