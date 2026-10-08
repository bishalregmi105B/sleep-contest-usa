# Build Report

## Summary

Built a scroll-driven 3D marketing site for The Great America's Sleep Contest:
one persistent WebGL scene that carries the visitor from dusk through midnight
to dawn, with the mint heartbeat motif running through every section as the
progress bar, the squad cards and the ticket. Registration, payment, ticketing,
referrals and a gated admin area all work with no credentials configured.
Verified end to end against a running server, then fixed nine defects that only
surfaced by actually looking at the rendered result.

## How to run

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed      # optional demo data
npm run dev          # http://localhost:3000
```

`npm run db:seed` only seeds when `SEED_DEMO=true` and refuses in production.
The mock payment provider completes instantly, so register → pay → ticket works
end to end with nothing configured. Admin needs `ADMIN_PASSWORD` and
`SESSION_SECRET` in `.env`.

## What was built

### Sections

| # | Section | 3D beat | Notes |
|---|---|---|---|
| 1 | `#hero` | Sleeper, pillow, moon, rising Zzz over the poster | Poster is the LCP paint and the no-WebGL fallback at 80% opacity so the live scene animates over it |
| 2 | `#counter` | Deepened dusk sky, moon gone | Real DB count, server-rendered then refreshed; ECG progress bar with `role="progressbar"` |
| 3 | `#how` | Horizontal rail dolly across four beats | Numbered 1–4, a real sequence, so numbering carries meaning |
| 4 | `#squad` | Dawn-orange backdrop, squad props, heartbeat strips | The only opaque section; plays its rounds once at 60% in view, with a replay button |
| 5 | `#prizes` | Spotlight, floating coins, confetti | Podium is DOM with CSS 3D perspective so the money stays crisp and readable; $100,000 slot-rolls once |
| 6 | `#gallery` | Dimmed parallax only | Honest "concept art" captions on every tile |
| 7 | `#reserve` | Pre-dawn | Cream card, zod validation on client and server, honeypot, 18+ check |
| 8 | `#faq` | Calm hold | Accordion with `aria-expanded`/`aria-controls`, grid-rows height animation |
| 9 | `#cta` | Sunrise and ringing alarm clock | Final ask, then the footer |

### Pages

`/ticket/[publicId]` boarding-pass ticket · `/friends` referral link and top
recruiters (mat numbers only, never names) · `/admin` gated dashboard with
search, pagination, totals and CSV export · `/rules`, `/refund`, `/privacy`
drafts with a visible draft banner · 404 and error pages · sitemap, robots,
manifest, OG image and favicon rendered in code.

### Backend

`POST /api/register` (zod, 18+ check, honeypot, rate limit, idempotent on
double submit, 409 for a duplicate paid email) · `POST /api/checkout` (mock
completes instantly, Stripe redirects to Checkout) · `POST /api/webhooks/stripe`
(raw body read before parsing, signature verified, idempotent through
`WebhookEvent`) · `GET /api/stats` · `GET /api/admin/export` CSV ·
`POST /api/admin/login`. Mat numbers are assigned as max + 1 inside a
transaction, retried on unique conflict.

## Measured numbers

| Metric | Measured |
|---|---|
| Routes | 21 (9 static, 5 dynamic, 1 partial prerender) |
| Production build | Compiles in ~0.4 s, prerenders 21 pages in ~1.8 s |
| Largest JS chunk | 242 KB gzipped (three.js, lazy-loaded after first paint) |
| Total JS + CSS | 585 KB gzipped across all chunks |
| Second largest chunk | 104 KB gzipped |
| Site images | 684 KB total, 11 files, all WebP, largest 100 KB |
| LCP element | The hero poster, `priority`, 31 KB |
| Console errors | None, on any page at any viewport |
| Failed requests / 404s | None |

The 3D chunk is loaded with `next/dynamic({ ssr: false })` on an idle callback,
so it is not in the critical path. Every section screenshot is captured with no
console error, no page error and no failed request.

**Not measured:** Lighthouse scores and frame rates. The Playwright suite was
removed for this client demo build, so those numbers are not recorded. Run
Lighthouse against a deployed build before launch; the image weights and lazy
loading above are the levers.

## Defects found by looking at the result

These were only visible by screenshotting every section and reading the code
behind what was wrong. Each is fixed and listed in `DECISIONS.md`.

1. **The scene had no lights.** Every standard material rendered black; the
   sleeper and pillow were dark masses. Added a hemisphere, key and fill light,
   all tinted from the current sky.
2. **ACES tone mapping desaturated the palette.** Dusk pink and Zzz yellow were
   pulled towards brown, so the 3D could never match the Stitch PNGs. Output is
   now untransformed.
3. **The Z letter geometry was malformed**, rendering as a blob rather than a Z.
4. **Cream on the dusk pink sky is 2.9:1** — a WCAG AA failure. Added a local
   scrim behind each section's content instead of darkening the palette.
5. **Section tracking was one behind.** Full-height sections sit at exactly 0.5
   trigger progress, so two adjacent triggers claimed the state and the wrong one
   won. Now resolved from the viewport centre.
6. **Mobile had no 3D at all.** A missing `hardwareConcurrency` (the normal case
   on iOS Safari) was treated as a weak device. Unknown now means capable.
7. **The header overlapped the ticker** — nothing reserved its height.
8. **The hero looked motionless.** The poster was opaque over the canvas,
   hiding the animated scene.
9. **Props drifted over unrelated copy** — a nightcap beside the FAQ, a pillow
   behind the counter. Objects now declare the sections they belong to.

Also fixed: the squad clipped its replay button, the gallery bento left a ragged
band, the sunrise was the same colour as the sky and read as a shadow, and the
heartbeat SVG path began with `L` instead of `M`, throwing on every render.

## Known gaps

- **Ticket 404 returns HTTP 200.** Under Next 16 `cacheComponents` the route
  partial-prerenders a shell, which commits 200 before `notFound()` can run.
  The correct not-found page is served, and `robots.txt` disallows `/ticket/`,
  so nothing is indexed. Fixing the status needs a middleware that checks the id.
- **No automated tests.** Removed for this client demo build. `scripts/shoot.mjs`
  remains as the screenshot and console-error check.
- **Lighthouse and fps not recorded.** See above.
- **Images are 1024px.** Google's CDN serves no larger variant; full-spec
  replacements are listed in `ASSETS_TO_GENERATE.md`.
- **In-scene signage remains in some images.** Cropping removed the large baked
  text, but small signage inside the scenes is still visible.
- **Rate limiting is in-memory.** Per instance, resets on restart. Production
  should use Redis or the platform limiter.
- **CSP ships report-only.** A strict policy that breaks the three.js worker or
  wasm pipeline in production is worse than a documented one being monitored.
  Review the report-only violations, then switch to `enforce`.

## Needs client input

- **4th prize amount.** The message said "$5"; $5,000 is assumed and built.
- **Sponsor name** — the "Presented by" line is hidden until `NEXT_PUBLIC_SPONSOR` is set.
- **Deadline date** — `NEXT_PUBLIC_CONTEST_DEADLINE`; until set, neutral wording is used.
- **Contact email** — `NEXT_PUBLIC_CONTACT_EMAIL`; until set, a generic link is shown.
- **Stripe keys** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **Resend key** — `RESEND_API_KEY`, `EMAIL_FROM`.
- **Real photography and video** to replace the concept art.
- **Generated assets** from `ASSETS_TO_GENERATE.md`.
- **A real logo.** The Stitch logo has "rubik" baked into it, so it was excluded
  from `public/` entirely.

## Client and legal decisions

A paid entry, cash prizes and a result decided by heart rate may be treated as a
lottery in some US states. The client should have a promotions lawyer review the
structure and the draft rules, waiver and privacy pages, and decide on a free
alternative entry route.

No free-entry route is implemented, deliberately: adding one would be a legal
decision made in code without advice. This report is not legal advice.

## Deployment notes (DigitalOcean Ubuntu)

1. Node 20+ and npm.
2. Set every env var from `.env.example`; `DATABASE_URL` points at PostgreSQL.
3. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.
4. `npm install`
5. `npx prisma migrate deploy`
6. `npm run build`
7. Serve with `npm start` under PM2 or systemd, behind Nginx with HTTPS.
8. Enable gzip or brotli; long-cache `/_next/static` and `/assets`.
9. Set `NEXT_PUBLIC_SITE_URL` to the real origin so canonicals and the sitemap
   are correct.
10. Monitor the CSP report-only header, then switch it to `enforce`.

## Next steps

- The second $29.99 payment, once the date is announced.
- A refunds flow.
- SMS reminders for the event date.
- A real heart-rate leaderboard for event day.
- Replace concept art with event photography.
- Record Lighthouse and fps before launch.