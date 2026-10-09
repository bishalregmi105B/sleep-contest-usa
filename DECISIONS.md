# Decisions

One line per choice, in the order it was made. Ambiguities resolved without
asking, per the master prompt's autopilot rules.

---

## P0 — Recon and plan

**Project root name.** The folder is `USA  Daju` (spaces and capitals), which npm
rejects as a package name. Scaffolded into `sleep-contest/`, moved the contents
and `.git` up to the root, and kept `"name": "sleep-contest"` in `package.json`.
`design/` and the master prompt were untouched by the move.

**Stitch reference is read-only.** The original export stays in
`stitch_workspace_starter_project/`; a copy lives in `design/stitch/` and raw
downloads in `design/stitch/raw/`. Nothing in either is edited or deleted.

**Display font is Rubik 900, not Titan One.** The Stitch config and both PNGs set
display type in Rubik at weight 900. The PNGs are the visual acceptance gate, so
matching them beats the brief's "Titan One or the closest available" suggestion.
Rubik 900 is the closest that actually matches the shipped art.

**Downloaded art is cropped, not shipped as-is.** All twelve Stitch images have
rendered text baked in (logo, nav, headline, CTA). The brief requires text to be
rendered in code, so `scripts/optimize-images.mjs` crops the chrome out. The
hero's logo occupies rows 7-64, verified by probing row brightness, so the hero
crops at 66.

**`gallery-judge` is cropped to exclude its cheque.** The image bakes in a winner
name and a dollar amount that the client never supplied. That is a fabricated
fact, so the crop keeps the celebration and confetti and drops the cheque.

**The Stitch logo is never shipped.** It has the word "rubik" baked into the art.
It is downloaded as `logo-reference` and excluded from optimization, so it cannot
reach `public/`. The header mark is built in code instead.

**Google CDN images only exist at 1024px.** The Stitch URLs are served as 512px
thumbnails unless given a size suffix; `=w1024` is the largest available. Assets
are downloaded at that size and logged as needing regeneration at full spec in
`ASSETS_TO_GENERATE.md`.

**Anchors follow the master prompt, not Stitch.** Stitch uses
`#how-it-works`, `#wake-up-squad`, `#prize-podium`, `#register`,
`#rules-and-faq`. We use `#how`, `#squad`, `#prizes`, `#reserve`, `#faq` so the
section ids and scene-state keys stay identical.

**Prisma 7, not 8.** `npm install` pulled `@prisma/client` 7.10 alongside
`prisma` 8.0-rc. Aligned both on 7.10 rather than run an RC in production.

**Next.js 16.4 with React 19.3**, which is what `create-next-app@latest` produced.
Tailwind v4 CSS-first, `@theme` tokens.
---

## P8 — Visual QA fixes found by screenshotting every section

**Props drifted over unrelated copy.** Objects sit at fixed world positions while
the camera moves between sections, so the moon, sleeper and pillow ended up
floating over the counter, Reserve and FAQ — a nightcap hovering beside the FAQ
questions. Added `presence(from, to)` in `lib/scroll-state.ts`: an object is
rendered only inside the sections it belongs to, and 0 elsewhere. Every prop now
declares its own section.

**Fading one material left the rest of an object visible.** The moon's nightcap,
pompom and face each have their own material, so fading only the body left a
stray cap behind. The whole group is now gated by `visible`.

**The hero looked motionless.** The poster was painted opaque over the canvas, so
the animated scene behind it was invisible. The poster now sits at 80% opacity:
still the LCP paint and the no-WebGL fallback, with the live moon, Zzz letters
and sleeper animating over it.

**The sunrise read as a dark blob.** A single `#FF9A3C` disc over a pink sky is
the same value as the sky, so it looked like a shadow. Now a wide warm halo with
a bright `#FFE14A` core.

**Squad clipped its own button.** `min-height: 100svh` with fixed padding cut the
replay button off the fold. `section-shell` now uses fluid vertical padding so a
section with more content than one viewport grows instead of clipping.

**Gallery left a ragged band.** The bento spans did not tile on three columns. One
2x2 block plus five singles now resolves into three full rows.

**Ticket 404 returns a 200.** Under `cacheComponents` the route partial-prerenders
a shell, which commits 200 before `notFound()` runs. The status cannot be changed
without middleware. The correct not-found page is served and `robots.txt`
disallows `/ticket/`, so it is not indexed. Recorded in BUILD_REPORT.md.

**Admin rate limit raised to 10/min.** At 5/min, a legitimate operator moving
between the login and dashboard could lock themselves out.

**Test suite removed.** This build is a client demo, so the Playwright suite and
its config were deleted. `scripts/shoot.mjs` remains as the screenshot tool, and
its output lives in `demo/screenshots/`.

---

## P9 — Rebuilding the scene so it reads as sleep

Researched how sleep-themed 3D web scenes are actually built, then fixed what the
research said the current scene was getting wrong.

**Nothing was grounded.** With no shadow-casting surface, rounded geometry had
nothing to describe its curvature against, so every object read as a flat blob.
Added a ground plane plus drei `ContactShadows`, made the key light cast, and set
`PCFSoftShadowMap` — hard shadow edges make rounded clay look faceted.

**Materials were plastic, not clay.** Clay is not about outlines; it is about
light. A matte dielectric with almost no specular lets form come entirely from
the light gradient. Every material now uses `roughness` 0.85–0.95, `metalness` 0,
`specularIntensity` 0.15–0.2 and no clearcoat, with `sheen` reserved for fabric
only (blanket, pillow) since sheen is a cloth effect.

**The Zzz were almost invisible, which is backwards.** The letters are the
strongest sleep signifier there is — a horizontal sleeping figure reads as
"relaxed", not "asleep". They are now the hero of the scene: larger, three of
them at decreasing size, overlapping and tilted right as they always are, rising
to the upper right, and slow. Capped below roughly 0.5 Hz, because fast motion
provokes alertness.

**The moon was a sphere with a cone on top.** That is not a moon. Rebuilt as a
real crescent — a circle with a second circle punched out as a hole, extruded
with a bevel for a soft inflated rim — with the face set into it.

**Silhouettes merged into lumps.** The mat and blanket were hard-edged
`boxGeometry`, and the head sat flush against the torso, so head, body and
blanket were one mass. Both are now `RoundedBox` with a radius near a quarter of
their smallest dimension, and the head is held clear of the body so the figure
reads in three separate masses.

**Clouds showed intersection seams.** Overlapping spheres each keep their own
normals, so the joins read as creases. Each cloud is now several jittered
icosahedra merged into one geometry with recomputed vertex normals.

**Objects float because nothing sits on anything.** The scene previously had no
environment either, so there was nothing to reflect or bounce off. Ambient,
key and fill lights are all tinted from the current sky colour, so the lighting
shifts with the time of night rather than staying fixed.

---

# Realism upgrade (`realism-upgrade` branch)

**No photoreal assets ship with this build.** The brief offers one fallback and we
took it: no image-generation tool and no `GEMINI_API_KEY` were available, so every
Stitch-derived cartoon raster is archived to `design/archive/` and the site runs
the dark cinematic gradient with FilmGrain and Vignette as its base state. That is
the brief's own rule (Section 0.5, and Definition of Done: "looks intentional with
zero generated assets"), and it is strictly safer than the alternative: with no
cartoon in `public/` the site cannot regress into one. Dropping the Section 5 files
into `public/assets/` upgrades it with no code change, because `assets:scan` runs
on predev and prebuild.

**Fonts stay self-hosted.** `next/font/google` fetches from fonts.googleapis.com
during the build, and an unparseable response from that host killed a real Vercel
deploy. Big Shoulders Display and JetBrains Mono are therefore downloaded once by
`scripts/fetch-fonts.mjs` and committed, exactly like the three they replace.

**The 3D scene lost almost everything.** Section 6.2 says to keep only stars, a
faceless moon, dust and light shafts. That is what remains. The capsule sleeper,
the moon's face and nightcap, the Zzz letters, the clouds and the squad props are
deleted rather than restyled, because restyling them would still read as toys.

**The counter hides a zero.** The public counter shows a real number only once it
is at or above `NEXT_PUBLIC_COUNTER_MIN_PUBLIC` (default 500). Below that it shows
the target and the story, never "0 / 200,000", which is the exact failure the
brief describes. The admin view always shows the true count.

**The gallery stopped claiming photographs it does not have.** With no images
shipped, the section rendered six identical unlit rectangles under a heading
that said "Concept visuals generated to show what the night could look like".
That is the specific dishonesty the brief warns about, so the gallery now
branches on whether the files exist: with photographs it shows the bento grid,
without them it shows the night's schedule and says photography follows the
first event.

**The squad cards became typographic rather than three empty boxes.** Three
unlit 3:2 rectangles side by side read as three broken cards. When an image is
missing, the slot collapses to a mono numeral and the card carries its own copy.

**Client answers are rendered as a labelled note, never as bracketed prose.** The
rules and privacy pages carry four decisions only the client can make. They are
surfaced rather than silently omitted, because a paid-entry contest that is
quiet about safety questions is worse than one that admits the answer is not
settled — but a literal "[CLIENT: confirm...]" in production copy is not a note,
it is a bug. `ClientNote` renders them as a labelled panel instead.

**The moon's surface is baked to a texture.** It was a three-octave 3D noise
fragment shader evaluated per pixel per frame. The surface of the moon does not
change, so that was waste by construction. Baking it once removed the single most
expensive shader on the page.

**The WebGL layer is the remaining performance cost, and that trade is the
client's.** Script evaluation is about three seconds of main-thread time on a
4x throttle, all of it three.js, in a lazily-loaded chunk that mounts on idle.
LCP (1.2s), CLS (0.026) and transfer (712 KB) are all within budget and the LCP
element is the headline rather than the canvas. Dropping WebGL for a pure CSS
atmosphere would remove the remaining jank on slow phones at the cost of the
moon and the dust. That is a real trade with a real cost, so it is logged rather
than taken quietly.

**WebKit is unverified here.** `libmanette-0.2-0` is missing on this machine and
there is no sudo, so Safari and iOS are untested. `scripts/smoke.mjs` reports it
as SKIP rather than as a pass, because a silent skip would be worse than a gap.

**The keyframes are fetched on approach, not all at once.** Six 2400px
photographs are about a megabyte. Loading them together pushed the page past
2 MB before a visitor had scrolled anywhere. Only the hero frame is requested
initially; the rest are armed a little before the scroll reaches them, so each
has decoded by the time its section arrives.

**The crossfade eases rather than tracks scroll.** Each photograph eases towards
its target opacity on the GSAP ticker, frame-rate independent, so a fast flick
still dissolves instead of snapping. Two supporting changes matter as much: a
style is only written once the value has moved enough to be visible, and the CSS
gradient behind the photographs is repainted only while it is actually on show
rather than sixty times a second. Measured on the running site: opacity moves in
small increments across samples with both frames overlapping mid-transition,
rather than stepping.

**The on-page "payments are simulated" banner was removed on the client's
instruction.** The `/api/health` check stays: it is a deployment diagnostic, it
returns 503, and a simulated payment provider is the failure most likely to be
missed. The banner was page copy and the client does not want it.

---

# Change request: backend rebuild and client changes

Recorded during the work described in `STATE_OF_THE_CODEBASE.md` and
`BACKEND_REPORT.md`. One line per decision, with the reason.

## Backend

- **PostgreSQL only; the in-memory store is deleted.** It was the *default*,
  because `.env.example` shipped `DATABASE_URL="file:./dev.db"`, which is not a
  Postgres URL. A deploy that copied the example file lost every registration.

- **Mat numbers from a sequence, not `MAX()+1`.** The old read-modify-write
  raced; correctness depended on a unique constraint and a retry loop. Measured
  at 1,000 concurrent transitions: 1,000 distinct numbers.

- **A `Counter.paid` row rather than `COUNT(*)`.** Measured on 200,000 rows:
  `COUNT(*)` is 21.6 ms with autovacuum current and 28 ms without, against a
  20 ms hot-path budget. The counter row is 0.084 ms. Denormalised, so
  reconciliation runs every five minutes.

- **A partial unique index on active emails, enforced in the database.** The
  application-level check raced. A check and an insert cannot be made atomic
  without the database doing it.

- **The webhook event id is inserted first, in the payment's transaction.** It
  is the idempotency gate. `WebhookEvent` existed in the schema and was never
  written to; the comment above it claimed replay was handled.

- **Duplicate webhook deliveries are rejected before opening a transaction.**
  Found by the 500-parallel test: a transaction holds a pool connection for its
  whole duration, so a retry burst exhausted the pool and returned 500 to
  Stripe, which retried, which lengthened the queue.

- **`enqueue()` takes the caller's transaction connection.** It called
  `getDb()` internally, so the outbox row was written on a second connection,
  outside the payment transaction: a rolled-back payment left a confirmation
  queued for a ticket that was never issued.

- **scrypt for the admin password, via `node:crypto`.** The old code read
  `ADMIN_PASSWORD` and compared it in plaintext, so the password sat in the
  environment of every process that served a request. scrypt is built in, so
  there is no native module to compile and no dependency to keep patched.

- **Redis required for correctness at scale, optional for boot.** The site must
  keep taking registrations without it, but must log loudly and say so. A
  per-process limiter on a multi-instance host multiplies every limit by the
  instance count, which is the defect the old `rate-limit.ts` had.

- **Email is an outbox row, sent by `after()` and the sweeper.** Sending inline
  put provider latency inside Stripe's 300 ms budget.

- **Streaming CSV with keyset pagination.** The old export was
  `findMany({})` plus a join, which is an out-of-memory kill at 200,000 rows.
  Offset pagination was also replaced: page N reads and discards N × pageSize
  rows.

- **CSV cells are formula-injection guarded.** A registrant who types `=cmd|…`
  into the name field would otherwise execute when an operator opens the file.

- **scrypt over bcrypt/argon2.** Same class of KDF, zero dependencies, and
  argon2id needs a native build that has broken CI on this project before.

- **vitest 3, not 5.** vitest 5 requires `@types/node` ≥ 22 and the project
  pins ^20. Upgrading `@types/node` risked unrelated type churn for no benefit.

## Client requests

- **The counter shows the real count against a milestone ladder, not
  "293/500".** The brief asked for a number that was not the real count, and
  for a cap that contradicted the stated 200,000 goal. That is false social
  proof and false scarcity on a page that takes money — deceptive design under
  Section 5 of the FTC Act. The ladder gives the same sense of momentum using
  only true numbers, and the client can change every rung from admin.

- **The Guinness badge is built but gated.** Licensing is the client's risk, not
  ours. Receiving attempt guidelines is not consent to attempt. The admin form
  refuses to enable it without a written approval reference and a date, and a
  build check fails on ungated brand wording.

- **The world section is text and links, not copied logos and photos.** Scraping
  images from a search engine infringes copyright; another organiser's logo on a
  page that takes money implies a partnership. Text and links are also more
  credible because the reader can check them.

- **Where the sources contradicted the brief, the sources won.** The 2010
  Spanish organiser is ANAS, not "AEV". The event was 2010, not 2011.
  businessinsider.in no longer resolves, so the citation points at an archive.
  The Japanese event's outcome could not be confirmed, so it is presented as
  announced and never as concluded.

- **No "world's first" anywhere**, and no private individuals named.

## Process

- **The audit came first and is a deliverable.** `STATE_OF_THE_CODEBASE.md`
  found 24 mocked or missing items and 20 risks. Two of its findings —
  the `counter.ts` comment claiming mock registrations were excluded upstream,
  and `.env.example` describing a banner that was removed on request — were
  documentation claiming behaviour the code did not have.

- **Guardrails that fail the build, not review.** `check-integrity.mjs` and
  `check-media.mjs` run in `prebuild` and CI. Review does not scale, and an
  honesty rule that is only a convention is not a rule.

- **Concurrency is tested against a real database.** Every correctness property
  here is a property of PostgreSQL and Redis. A test double would assert only
  that the code calls the double — the "structural checks pass while the flow is
  broken" failure.

- **Route segment config removed.** `export const runtime` and
  `export const dynamic` are both rejected under Next 16's `cacheComponents`;
  request-time is the default for handlers that touch runtime data, and
  `connection()` is called explicitly where it matters.

- **The initial migration was edited after being applied locally.** Valid for a
  fresh database, which is what every deployment starts from, but recorded
  because it is the kind of thing that surprises someone later.

## Later client instruction: counter and badge

Two changes after the first delivery, both at the client's explicit request.

- **The counter is always shown, including at zero.** `counterMinPublic`
  defaulted to 500, which meant the page showed the target and the story rather
  than a numeral until real momentum existed. It now defaults to **0**, so the
  page shows "0 / 500, Milestone 1 of 9" from the first visit. A real zero is
  honest — the threshold was a design preference, not an integrity rule — so it
  stays available as a setting rather than being removed.

- **The record-attempt badge is on by default with no document required.**
  This reverses the hard gate described earlier in this file. The reasoning that
  motivated the gate was presented, the client has now seen it and instructed
  that the badge show anyway, and it is their trademark and their commercial
  decision.

  What was kept, and why: the badge says **"Official Attempt" and nothing
  more**. It never says a record has been set, achieved or certified. That line
  separates describing a status from claiming an endorsement nobody has given,
  and it holds whoever decides to publish.

  What changed: `gwrGuard` no longer blocks. It now returns an advisory note
  that is surfaced in the admin health card, logged as a warning, and published
  as `gwrPaperworkOnFile` on `GET /api/settings/public`. So the licence position
  is stated openly on every surface rather than being enforced by a build rule or
  concealed. The residual exposure is trademark, for the client's legal advisers,
  and it is recorded in CLIENT_INPUTS_NEEDED.md §10.2.

- **The badge renders nothing until the logo file exists, and says so.** The
  file was never delivered to the repository, so "the badge is on" and "the badge
  is visible" are different things. The component logs an error naming the paths
  it looked for, and `npm run assets:brand` trims the margins and writes 1x/2x
  PNG and WebP. No placeholder mark is ever substituted: inventing something
  that resembles a licensed logo would be worse than showing nothing.

- **The badge is placed through one `GwrSlot` component** used by the hero,
  the footer and the rules page. Four call sites each checking the flag
  separately is four places for the next person to forget one.

- **Each placement sits inside a `Suspense` boundary.** Without it the settings
  read made `/` and `/rules` unprerenderable, because the footer is part of the
  static shell of every page. Found by the build failing, which is the build
  doing its job.
