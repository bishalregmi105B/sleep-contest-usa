# The Great America's Sleep Contest

A scroll-driven 3D marketing site for sleepcontestusa.com. The page is one
night: you scroll from dusk to midnight to dawn, and a mint heartbeat line runs
through it — spiky while you are awake, flat once you are asleep deeply. That
same heartbeat is how the contest is scored, so the motif is the argument rather
than decoration.

Everything runs with **zero credentials**. Payments use a mock provider, email
prints to the console, and the database is a local SQLite file.

## Run it

```bash
npm install
cp .env.example .env
npm run db:push      # create the SQLite schema
npm run db:seed      # optional: 24 demo registrations
npm run dev
```

Open <http://localhost:3000>. The full flow works end to end: register → pay
$10 (instantly, mock provider) → boarding-pass ticket.

To try the admin area, set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`, then
visit `/admin`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` / `npm run typecheck` | ESLint and `tsc --noEmit` |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Demo data (only when `SEED_DEMO=true`, never in production) |
| `npm run assets:scan` | Rebuild `src/lib/assets.generated.json` |
| `npm run assets:fetch` | Re-download the Stitch images |
| `npm run assets:optimize` | Crop, re-encode and emit blur placeholders |
| `node scripts/shoot.mjs` | Screenshot every section at 1440 px and 390 px into `demo/screenshots/` |

`predev` and `prebuild` run `assets:scan`, so the asset manifest is always fresh.

## How it is built

```
src/
  app/            routes: /, /ticket/[publicId], /friends, /admin,
                  /rules, /refund, /privacy, and the API routes
  components/
    layout/       header, ticker, footer, mobile menu, legal layout
    sections/     the nine scroll sections
    ui/           sticker button, glass card, heartbeat line, ticket
    motion/       smooth scroll, scroll binder
    three/        the single persistent canvas and its objects
  content/site.ts every word and number on the site
  lib/            scroll state, quality tiers, validation, db, payments, email
design/           Stitch reference, design plan, screen map
scripts/          asset pipeline
prisma/           schema and seed
demo/screenshots/ every section captured at 1440 px and 390 px
```

**One canvas.** A single fixed `<Canvas>` sits behind the DOM at `z-0`. No
section creates its own WebGL context. The scene is a state machine keyed by
section id; scrolling interpolates between the two states the viewport sits
between, so dusk reads as one continuous move into midnight and out to dawn.

**Per-frame values never touch React state.** `lib/scroll-state.ts` is a plain
mutable object written by ScrollTrigger and read inside `useFrame`. Routing
those through React would re-render the tree sixty times a second.

**Copy lives in one file.** `src/content/site.ts` holds every string, prize and
number. No copy is hardcoded in JSX, so the client's brief is one edit away.

**Assets upgrade themselves.** `scripts/scan-assets.mjs` writes
`src/lib/assets.generated.json`; components ask for a key and get back
`{ src, exists }`, rendering a procedural or CSS fallback when it is missing.
Every 3D object is procedural, so the site builds and looks complete with no
generated assets at all.

**Quality tiers.** `lib/quality.ts` picks `high`, `med`, `low` or `none` from
WebGL2 support, GPU, cores, memory, Save-Data and viewport. A `PerformanceMonitor`
steps the tier down once if frames are dropped. With no WebGL2, or with
`prefers-reduced-motion`, the page renders a composed CSS night instead and
stays complete and usable.

**Text always clears its background.** The palette passes WCAG AA on midnight and
indigo, but only reaches 2.9:1 against the dusk pink the sky passes through, so
each section carries a local midnight scrim behind its own content rather than
the palette being darkened and the idea lost.

## What is real and what is stubbed

Working with no configuration: registration and validation, the mock payment
provider, mat number assignment inside a transaction, the ticket, the referral
leaderboard, the admin gate and CSV export, the console email provider.

Switches to a real provider the moment its keys exist: `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` move checkout to Stripe Checkout with a signature-verified
webhook; `RESEND_API_KEY` and `EMAIL_FROM` move confirmation email to Resend.

Not built, because they are client decisions or need real assets: the second
$29.99 payment, refund processing, SMS reminders, a live heart-rate leaderboard
for event day, and the free-entry route. See `BUILD_REPORT.md`.

## Adding assets

Drop a file into `public/assets/images/` and run `npm run assets:scan`. The
prompts for everything still missing, and the style lock they must share, are in
`ASSETS_TO_GENERATE.md`.

## Documentation

| File | What is in it |
|---|---|
| `BUILD_REPORT.md` | What was built, measured numbers, gaps, what needs client input |
| `DECISIONS.md` | Every judgement call and why |
| `ASSETS_TO_GENERATE.md` | Prompts for missing art, models, video and audio |
| `design/DESIGN_PLAN.md` | Palette, type roles, wireframes, principles |
| `design/STITCH_MAP.md` | What was in the Stitch export and how it mapped |
| `demo/screenshots/` | Every section at 1440 px and 390 px |

## Deploying

Node 20+. Set every env var, point `DATABASE_URL` at PostgreSQL, change the
provider in `prisma/schema.prisma`, run `prisma migrate deploy`, then
`npm run build && npm start` behind Nginx with HTTPS. Full notes are in
`BUILD_REPORT.md`.