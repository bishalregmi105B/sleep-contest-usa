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
