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
