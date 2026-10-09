# The Great America's Sleep Contest

A cinematic one-night marketing and registration site for sleepcontestusa.com.
Scrolling moves from dusk through midnight to sunrise, and a heartbeat line runs
through it: spiky while a sleeper is awake, flat once they are asleep deeply.
That same heartbeat is how the contest is scored, so the motif is the argument
rather than decoration.

**It builds with zero credentials, and refuses to run in production without
them.** Locally you can start with nothing configured. In production the server
throws on first request if the database is missing, and issues **no tickets at
all** if Stripe is not configured — it serves a waitlist instead, and says so.

That is a deliberate change. The previous build defaulted to an in-memory store
and a mock payment provider, which meant a deploy that lost its Stripe keys
quietly handed out paid tickets for free. See `BACKEND_REPORT.md` §4.

## Run it

```bash
docker compose up -d          # PostgreSQL and Redis
cp .env.example .env.local    # point DATABASE_URL at compose
npm install
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>. The full flow works end to end: register → pay
$10 → boarding-pass ticket → referral link → admin.

The build itself needs no database and no network:

```bash
npm run build
```

## What the backend does

- **Capacity is enforced, not advertised.** The registration cap is an atomic
  database check, editable from admin. Past it, the site serves an honest
  waitlist rather than an error page.
- **The public counter is the real paid count.** No offsets, no seeds, no
  multipliers — a build check fails if anyone adds one. It is shown against an
  admin-editable milestone ladder with the final goal always visible.
- **Payments are exactly-once.** Webhook events are written in the same
  transaction as the state change, so a Stripe retry cannot double-issue a mat
  number or re-send a confirmation.
- **Email is an outbox.** Provider latency never sits inside the webhook's
  acknowledgement budget, and a provider outage queues rather than loses mail.
- **It is built and measured for 200,000 registrations.** Numbers, machine specs
  and reproduction commands in `LOAD_TEST_REPORT.md`.

## Tests

```bash
npm test        # 58 tests, against real PostgreSQL and Redis
```

The concurrency tests are not mocks. Every guarantee this project claims —
atomic capacity, exactly-once webhooks, unique mat numbers, a shared sliding
window — is a property of the database and the cache, and a test double would
only prove the code calls the double.

## What it looks like

The previous build was illustrated — glossy clay-and-inflatable renders, a
sleeping infant in a nightcap, a smiling moon wearing a nightcap, extruded "Zzz"
letters — and the client's note was "it looks like a cartoon, it needs reality".
Every one of those images is archived in `design/archive/stitch-cartoon/` and
none is served.

The site is now carried by light: nineteen photographs in one night-time
documentary grade, a dusk-to-dawn sky that crossfades between them as you
scroll, film grain, a vignette, and one atmosphere layer of stars, a faceless
cratered moon, dust and light shafts.

**The imagery is concept work and says so.** Every photograph is labelled
"Concept visual", the gallery subheading says they were generated, and the footer
repeats it. They show what the night could look like, not a past event. Real
photography from the first event should replace them.

The site still runs with no images at all: `CinematicStage` paints the same sky
phases as a gradient when the keyframes are absent, and the gallery switches to
the night's schedule rather than leaving an empty grid under a heading about
concept visuals. See `ASSETS_TO_GENERATE.md`.

## Honesty, because this is a paid entry

A contest that takes $39.99 cannot afford to be vague. Four rules govern the
site:

- **No false counts.** The final CTA is derived from the real registration count.
  The old claim of "200,000 Americans already registered" above a counter reading
  zero is gone.
- **A zero is never shown.** Below `NEXT_PUBLIC_COUNTER_MIN_PUBLIC` (default
  500) the page states the target and the story. The number appears when it is
  real. The admin view always shows the true total.
- **Simulated payments say so.** A production deployment left on the mock
  provider shows a persistent banner saying no money is taken and no ticket is
  issued for real.
- **Nothing is invented.** No fake winners, cheques, crowd numbers or sponsor
  logos. The Stripe line appears only when Stripe is live. Unset contact details
  are hidden, never rendered as a placeholder.

`GET /api/health` reports which providers are active and returns **503** with a
list of what is missing, so the two silent-failure modes — the in-memory store
resetting on deploy, and the simulated payment provider looking like a real one —
cannot pass unnoticed.

## Layout

```
L0  CinematicStage   the dusk-to-dawn sky, driven from scroll in CSS
L1  SceneSlot       one persistent R3F canvas: stars, moon, dust, light shafts
L2  section scrims  each block sits on its own pool of ink (WCAG AA)
L3  FilmLayers      film grain and vignette over the whole page
```

The page is complete and usable with no JavaScript and no WebGL. With reduced
motion it is a calm, static document.

## Checks

```bash
npm run build && npm start &
npm run check     # 64 acceptance checks
npm run smoke     # Chromium + Firefox, registration to ticket
node scripts/shoot.mjs demo/after   # screenshots, 1440 and 390
```

`npm run check` covers the counter threshold, production copy, the photography
(every gallery tile present, uniquely captioned and labelled), the facts bar, FAQ
gating, footer identity, analytics payloads, axe on four routes, reduced motion,
Save-Data, no-WebGL and layout stability.

Measured on the production build at 390 px with a 4× CPU throttle: **LCP 1.2 s**,
**CLS 0.026**, axe clean, zero console errors. `REALISM_REPORT.md` has the full
numbers and the two known gaps.

## Imagery, optionally generated

```bash
GEMINI_API_KEY=... npm run images:generate
```

Reads `scripts/image-prompts.json`, writes WebP and AVIF to `public/assets/`,
and never overwrites an existing file. Without a key it skips silently, because
the dark fallback is a valid state.

## Documentation

| File | What it is |
| --- | --- |
| `DEPLOY.md` | Launching it. Read the top before a real launch. |
| `CLIENT_INPUTS_NEEDED.md` | **What the client must supply, and what blocks launch.** |
| `CLIENT_PRESENTATION.md` | Six-slide client deck. |
| `REALISM_REPORT.md` | What changed, what was measured, what was deferred. |
| `REALISM_PLAN.md` | The plan this pass executed. |
| `docs/EMAIL_PLAN.md` | The follow-up email sequence. Described, not built. |
| `ASSETS_TO_GENERATE.md` | Style lock v2 and every photograph the site expects. |
| `DECISIONS.md` | Why it is built this way, including the reversals. |

## Not legal advice

The legal pages are drafts written from the brief. A paid entry with cash prizes
and a result decided by heart rate may be treated as a lottery in some US states,
and whether a free alternative way to enter must be offered depends on the
structure and the state. The client's promotions lawyer should review the rules,
the waiver, the privacy policy and the paid-entry structure before launch. There
is currently **no waiver document**; the form references one.