# Realism upgrade plan

Branch: `realism-upgrade`. Companion document: `REALISM_PROMPT.md` (the brief) and
`PROFESSIONAL_LAYER_PROMPT.md` (the trust layer, run after this).

## Diagnosis confirmed on the live build

Every cartoon signal listed in Section 1 of the brief was reproduced from the
running production server before anything was changed. Baseline screenshots are in
`demo/before/` at 1440 and 390 px, captured with `scripts/shoot-before.mjs`
against `npm run start`.

| Signal | Evidence |
| --- | --- |
| Toy 3D world | `1440-hero.jpg`: sleeping infant in a striped nightcap on an inflatable cloud, smiling crescent moon wearing a nightcap, glossy extruded yellow "Zzz" balloon letters |
| Sticker chrome | Pink CTA with a hard offset shadow, tilted yellow `WIN $100,000` badge with a pink offset block |
| Candy surfaces | `1440-squad.jpg`: the entire wake-up squad section is a saturated orange-to-yellow gradient, with tilted cards, 3 px ink borders and a pink offset shadow |
| Emoji | Trophy in the 1st prize podium block |
| Puffy display face | Rubik at weight 900 reads inflated rather than condensed |
| Image/caption mismatch | Step 3 "Sleep for 90 minutes" shows a feather; step 4 "Survive the wake-up squad" shows a chef with bacon. Squad round 1 "The Noise Round" shows an arena floor, round 3 "The Smell Round" shows a leaderboard screen. Gallery tiles reuse `how-3`, `how-2` and `squad-noise` |
| Double numbering | Every step card shows a `01` chip *and* an sr-only "Step 1:" |

Content and technical bugs from Section 1 are confirmed too: the final CTA claims
"Join 200,000 Americans already registered" over a counter reading 0, the
contact line is a `mailto:` that is not used (`contactHref` falls back to
`/friends`), the honeypot is off-screen but still carries a visible label, and
`metadataBase` resolves to `localhost` unless `NEXT_PUBLIC_SITE_URL` is set.

## The one constraint that shapes the asset strategy

**No image-generation tool or API key is available in this environment**, and the
brief's autopilot rules forbid inventing assets. So the plan follows the brief's
own fallback rule (Section 0.5 and Section 11): *if a photoreal asset is not
available, the page must fall back to a dark cinematic gradient with grain and
vignette, never to a cartoon image.*

Concretely:

1. Every Stitch-derived cartoon raster is moved out of `public/` into
   `design/archive/`. The site ships with **zero** raster images.
2. `CinematicStage` renders a dark, filmic, section-aware gradient sky driven from
   `scroll-state`, with FilmGrain and Vignette over it. That is the "intentional
   with zero assets" state the brief's Definition of Done asks for.
3. `ASSETS_TO_GENERATE.md` is rewritten to style lock v2 with the exact prompt and
   path for all 6 keyframes, 13 section stills and the optional video sequence, and
   `scripts/image-prompts.json` plus `scripts/generate-images.mjs` make dropping
   them in a one-command job that never overwrites an existing file.
4. When the files appear, the asset manifest picks them up on the next
   `assets:scan` (which runs on predev and prebuild) and the stage switches from
   gradient to stills to frame sequence automatically. No code change.

This is strictly better than shipping placeholders: the site cannot regress into
"cartoon" because there is no cartoon left to regress to.

## Files to touch

**Foundations**
- `src/app/globals.css` — new token set, FilmGrain, Vignette, ECG grid, print styles
- `src/app/layout.tsx` — new self-hosted display face, metadataBase fallback chain
- `scripts/fetch-fonts.mjs` — Big Shoulders Display + JetBrains Mono
- `src/lib/scroll-state.ts` — cinematic sky stops, `sequenceProgress`

**Components**
- `src/components/ui/*` — `Button` (replaces `StickerButton`), `Card` (replaces
  `GlassCard`), `EcgLine` (replaces `HeartbeatLine`), `HeartStrip`, `Ticket`, `Field`
- `src/components/media/*` — `CinematicStage`, `Frame`, `Plate`
- `src/components/layout/*` — `Header`, `Footer`, `Ticker`, `Preloader`, `SkipLink`
- `src/components/sections/*` — every section
- `src/components/three/*` — `SceneRoot` reduced to `Atmosphere`

**Deleted**
- `three/objects/{Moon,ZzzLetters,SceneObjects,Clouds,Sleeper,Pillow}.tsx`
- `ui/StickerButton.tsx`, `ui/GlassCard.tsx`
- `sticker-btn*`, `tilt-*`, `--shadow-sticker*` utilities and tokens

**Content, scripts, docs**
- `src/content/site.ts` — all copy, facts bar, rules summary, timeline, FAQ status
- `scripts/scan-assets.mjs`, `scripts/optimize-images.mjs`, `ASSETS_TO_GENERATE.md`
- `DECISIONS.md`, `README.md`, `DEPLOY.md`, `BUILD_REPORT.md`, `REALISM_REPORT.md`

## Order of work

R1 foundations and bugs → R2 asset reset → R3 cinematic engine → R4 sections →
R5 motion → R6 hardening → R7 report. Then the professional layer, P1 to P6.
Lint, `tsc --noEmit` and `npm run build` after every phase; one commit each.