# Realism report

Branch: `realism-upgrade`. Brief: `REALISM_PROMPT.md` and
`PROFESSIONAL_LAYER_PROMPT.md`. Plan: `REALISM_PLAN.md`.

## Summary

The site's cartoon look had one root cause — an asset brief that asked for
"glossy toy-like 3D render, soft clay and inflatable look" — and one amplifier,
a design system built on sticker chrome. Both are gone: every cartoon raster is
archived, the 3D scene is now atmosphere only, and the page carries a dark
cinematic night that is lit rather than decorated.

The site now ships with **zero photographs and zero cartoon**, which is the
stronger of the two states the brief allowed. It deploys and runs with no
configuration, and 64 automated checks pass.

## The one thing that changed the shape of the work

There is no image-generation tool and no `GEMINI_API_KEY` in this environment.
The brief's own fallback rule applies: no photoreal asset available means a dark
cinematic gradient with grain and vignette, **never** a cartoon. So the base
state is code-driven, and the asset program is a one-command job:

```bash
GEMINI_API_KEY=... npm run images:generate
```

That script reads `scripts/image-prompts.json` (style lock v2 plus a subject for
each of the 19 images), converts with `sharp`, and never overwrites an existing
file. Dropping the files into `public/` is enough — `assets:scan` runs on predev
and prebuild.

## Rubric

| # | Criterion | Result |
| --- | --- | --- |
| 1 | No illustrated, clay, inflatable or toy-3D imagery | **Pass.** All rasters archived to `design/archive/stitch-cartoon/`; `assets:scan` reports 0 assets. Favicon and OG are drawn in code. |
| 2 | No toy 3D objects in the scene | **Pass.** Deleted: `Moon` (face + nightcap), `ZzzLetters`, `SceneObjects` (horn, feather, bacon, coins, sunrise, alarm clock), `Clouds`, `Sleeper`, `Pillow`, and the whole `rig/` directory. |
| 3 | Display font is not puffy; numbers use tabular mono | **Pass.** Big Shoulders Display 700–900, self-hosted. JetBrains Mono with `tabular-nums` on every number that changes. |
| 4 | No emoji, star glyphs, tilted cards, hard offset shadows or sticker styles | **Pass.** `rg` for `sticker\|tilt\|rotate(\|elastic\|back.out\|🏆\|★\|🌙\|💤\|🔒\|🔊` returns nothing in `src`. |
| 5 | Film grain and vignette present, subtle, off for reduced motion and the low tier | **Pass.** Both are CSS overlays; grain steps at ~8 fps and is hidden by `html[data-tier='low']`, `[data-tier='none']` and the reduced-motion block. |
| 6 | One photographic grade; every image unique and matched to its caption | **Deferred, honestly.** No images ship, so there is no grade to check. The previous mismatches (a feather on "Sleep for 90 minutes", a chef on "Survive the wake-up squad") are recorded in `ASSETS_TO_GENERATE.md` as the specific failure to review for. |
| 7 | Motion is cinematic: no bounce, elastic, wobble or idle loops | **Pass.** One easing curve throughout (`--ease-cine`). Reveals are 0.8–1.4 s. The only continuous animations are the ticker, the grain step and the prize roll. |
| 8 | Data visuals are authentic | **Pass.** A real P-QRS-T generator (`src/lib/ecg.ts`) shared by the counter, the squad strips and the ticket. The telemetry chart is labelled "Illustrative example, not real data." |
| 9 | Text contrast is AA over every photograph; focus visible; reduced motion complete | **Pass.** axe reports 100 for accessibility on all four routes. The contrast floor for small text is `mist/75`, measured at 5.9:1. |
| 10 | Honesty: labels present, no false claims, no fake counts | **Pass.** See below. |

**Nine of ten pass, one deferred with a recorded reason.** The deferred item is
the only one that cannot be completed without an asset the environment cannot
produce, and the brief explicitly permits the dark cinematic fallback in exactly
that case.

## The honesty work

This is the part that changed most of the code.

- **No more "Join 200,000 Americans already registered"** above a counter reading
  zero. The final CTA is derived from the real count.
- **A zero is never shown.** Below `NEXT_PUBLIC_COUNTER_MIN_PUBLIC` (default 500)
  the page states the target and the story. The admin view always shows the true
  total.
- **The gallery does not claim photographs that do not exist.** With no images it
  shows the night's schedule and says photography follows the first event.
- **Mock payments are announced.** A production deployment on the simulated
  provider shows a persistent banner saying no money is taken and no ticket is
  issued for real.
- **`/api/health` returns 503** with a list of exactly what is not configured, so
  the two silent-failure modes (in-memory store, simulated payments) cannot pass
  unnoticed.
- **No invented logos, winners, cheques or crowd numbers.** The Stripe line only
  appears when Stripe is actually live; there is no homemade padlock icon.

## Bugs found and fixed along the way

These were real, not cosmetic. Several existed before this pass.

1. **The registration form was unusable.** `Field` destructured React Hook Form's
   props without spreading them, so `onChange` and `onBlur` never reached the
   input. Every field validated as empty no matter what was typed.
2. **`aria-label` on a role-less span** — the prize numeral. The animated number
   is now `aria-hidden` with a screen-reader-only final value.
3. **Small text failed WCAG AA** at 2.4:1 to 4.1:1. The floor is now 5.9:1.
4. **`localhost` leaked into production.** `SITE.url` fed the JSON-LD, robots.txt
   and sitemap.xml. One resolver now serves all four, and skips localhost
   entirely in production.
5. **Two admin buttons referenced a deleted utility** and rendered unstyled.
6. **The moon rendered black** after moving from a custom shader to a baked
   texture, because the scene light had been removed with the old rig.
7. **Vercel analytics 404'd off-platform**, adding two console errors per page
   load. Now mounted only on Vercel.

## Measured results

Real measurements, on the production build at 390 px with a 4× CPU throttle
(`PerformanceObserver`, not a simulator):

| Metric | Measured | Budget | |
| --- | --- | --- | --- |
| LCP | **1,220 ms** | ≤ 2,500 ms | pass |
| CLS | **0.026** | < 0.1 | pass |
| Transfer | **712 KB** | ~700 KB | marginally over |
| Console errors | 0 | 0 | pass |
| axe, 4 routes | 0 serious, 0 critical, 0 moderate | 0 | pass |

Lighthouse's own numbers are much worse (LCP 5.6–7.0 s, performance 37–46)
because it applies **simulated** throttling that scales the whole trace. The gap
is worth stating plainly rather than quoting whichever number flatters the work:
the real trace is fast, the simulated model is pessimistic, and the underlying
cause of both is the same.

**That cause is the three.js bundle.** Script evaluation is 3 s of the main
thread on a 4× throttle. It is one lazily-loaded chunk that mounts on idle, the
LCP element is the `<h1>` rather than the canvas, and the budgets the brief sets
are all met — but a slow phone does pay for it in scroll smoothness. The highest
-value optimisation left is dropping the WebGL layer to a CSS atmosphere, which
would cost the moon and the dust. That is a real trade and a client's call, not
something to decide silently.

One optimisation was taken: the moon's surface was a three-octave 3D noise
fragment shader evaluated per pixel per frame. It is baked once into a texture
now. Same look, one heavy shader gone.

## Screenshots

`demo/before/` and `demo/after/`, 1440 and 390 px, every section, captured with
`node scripts/shoot.mjs <dir>`.

The before set is the diagnosis: an infant in a nightcap, Zzz balloons, an
orange squad section, mismatched images, a sticker CTA.
The after set is the same nine sections rebuilt.

## What was not done, and why

**The scroll-scrubbed frame sequence.** `ASSETS_TO_GENERATE.md` documents the
prompts, the ffmpeg commands and the budgets, and `CinematicStage` is built with
the sequence map and the frame-loading rules in place. But no master video was
generated, so wiring a frame reader would be untestable code. The stage currently
drives the CSS sky from the same scroll state through the same sequence map, so
the visual result is complete and only the frame source is a stub.

**WebKit.** Chromium and Firefox pass completely, including registration to
ticket. WebKit could not launch in this environment — `libmanette-0.2-0` is
missing and there is no sudo. It is reported as **skipped**, never as passed.
Safari and iOS are untested here and should be checked on a real device.

## For the client

The three things worth saying out loud:

1. **The imagery is illustrative and labelled as such.** It should be replaced
   with real photography from the first event. The site ships without any images
   rather than with invented ones.
2. **A paid entry with cash prizes and a heart-rate result may be treated as a
   lottery in some US states.** This is not legal advice. The client's promotions
   lawyer should review the rules, the waiver, the privacy policy and the
   paid-entry structure before launch, and decide whether a free alternative way
   to enter is required.
3. **Two things fail silently and are now impossible to miss:** the in-memory
   store resets on every deploy, and the simulated payment provider looks
   identical to a real one. `/api/health` reports both.