# Assets to generate

The site builds, runs and looks complete **without any of the assets below**. Every
3D object is procedural, and every missing image falls back to a CSS gradient. Drop a
file into `public/` and it is picked up automatically with no code change.

## How the upgrade works

`scripts/scan-assets.mjs` runs on `predev` and `prebuild`, scans `public/assets` and
`public/models`, and writes `src/lib/assets.generated.json`. Components call
`asset("hero-poster")` and get `{ src, exists }`; when `exists` is false they render
their fallback. That is why there are no 404s and no grey boxes.

## Style lock

Every 3D-style image prompt below ends with the same clause:

> glossy toy-like 3D render, soft clay and inflatable look, rounded forms, pink and
> yellow rim light against deep indigo night, shallow depth of field, **no text, no
> logos**

**No text, no logos matters.** All words on the site are rendered in code. Every image
downloaded from the Stitch export had its baked-in text cropped out
(`CROPS` in `scripts/optimize-images.mjs`); these prompts are how you get clean art
instead of cropped art.

## Images still missing

| Key | Path | Size | Prompt (subject) |
|---|---|---|---|
| `hero.poster` | `public/assets/images/hero-poster.webp` | 2400×1350 | Cheerful adult in striped pajamas asleep on a fluffy mat with a giant pillow, smiling crescent moon in a sleep cap, giant glossy yellow Zzz letters, dusk sky with stars |
| `squad.backdrop` | `public/assets/images/squad-backdrop.webp` | 2400×1200 | Dawn-orange to yellow gradient with soft rays |
| `cta.backdrop` | `public/assets/images/cta-backdrop.webp` | 2400×1350 | Sunrise gradient sky |
| `layers.sleeper` | `public/assets/images/layers/sleeper.png` | transparent | The sleeper alone, same style, for the no-WebGL parallax |
| `layers.moon` | `public/assets/images/layers/moon.png` | transparent | The smiling crescent moon alone |
| `layers.zzz` | `public/assets/images/layers/zzz.png` | transparent | A cluster of glossy yellow Zzz balloons |
| `layers.stars` | `public/assets/images/layers/stars.png` | transparent | A dense starfield |
| `layers.clouds` | `public/assets/images/layers/clouds.png` | transparent | Soft indigo clouds |
| `prize.trophyGold` | `public/assets/images/trophy-gold.webp` | transparent | Glossy gold trophy |
| `prize.trophySilver` | `public/assets/images/trophy-silver.webp` | transparent | Glossy silver trophy |
| `prize.trophyBronze` | `public/assets/images/trophy-bronze.webp` | transparent | Glossy bronze trophy |
| `prize.cashBag` | `public/assets/images/cash-bag.webp` | transparent | A bag of cash with dollar signs |
| `gallery.1`–`gallery.6` | `public/assets/images/gallery-{1..6}.webp` | 1600×1200 | Warm cinematic night photography: crowd in pajamas on mats in an arena; judge with a feather; winner with a giant check; leaderboard on a giant screen; best-pajamas line-up; judges whispering through a megaphone |

## Images to replace

These ship and work, but they were cropped out of Stitch art, so they are lower
quality (1024px) and may still carry in-scene signage. Regenerate at full spec:

| Current file | Replace with | Note |
|---|---|---|
| `how-1-register.webp` | `public/assets/images/how-1-register.webp` | Arena floor lined with thousands of illuminated inflatable sleeping mats |
| `how-2-pajamas.webp` | same | Contesters in funny pajamas; the current crop shows referees with horns |
| `how-3-leaderboard.webp` | same | Rows of sleepers under a glowing leaderboard |
| `how-4-feather.webp` | same | A judge with a feather over a sleeper |
| `squad-noise.webp` | same | Air horn with sound rings, alarm clock and a rooster |
| `squad-tickle.webp` | same | A long feather |
| `squad-smell.webp` | same | Bacon strips with steam and a coffee cup |
| `gallery-*.webp` | same | Six event-mood tiles |

## Video

`public/assets/video/`, 720p, each under 2 MB, muted seamless loops:

| Key | Filename | Length |
|---|---|---|
| `video.heroLoop` | `hero-loop.mp4` + `.webm` | 6–8 s seamless |
| `video.squadTeaser` | `squad-teaser.mp4` + `.webm` | ~15 s |
| `video.gallery1` | `gallery-1.mp4` + `.webm` | short loop |
| `video.gallery2` | `gallery-2.mp4` + `.webm` | short loop |

Every video needs a poster frame, or the tile shows an empty box.

## 3D models

`public/models/*.glb`, 1 MB each, about 5 MB total. Every object already works
procedurally, so these are upgrades, not requirements:

`sleeper.glb`, `pillow.glb`, `moon.glb`, `zzz.glb`, `air-horn.glb`,
`alarm-clock.glb`, `feather.glb`, `bacon.glb`, `trophy.glb`, `podium.glb`

Generate in an image-to-3D tool or sculpt in Spline or Blender. Compress with
`npx gltfjsx model.glb --transform`, which applies Draco or Meshopt compression.

## Audio

`public/assets/audio/`, short, looped:

| Key | Filename | Description |
|---|---|---|
| `audio.lullaby` | `lullaby.mp3` | Soft music-box lullaby loop |
| `audio.airhorn` | `airhorn.mp3` | Air horn hit |
| `audio.ding` | `ding.mp3` | Success ding |

Audio is optional and off by default. If the files are absent the header toggle hides
itself rather than failing.

## Brand

- `public/favicon.ico`, `public/icon.png`, `public/apple-touch-icon.png`
- The current favicon and OG card are generated in code (`src/app/icon.tsx`,
  `src/app/opengraph-image.tsx`), so only replace them if you want artwork.

**Note on the Stitch logo.** The exported logo has the word "rubik" baked into the art,
so it is never shipped. A real logo mark, moon in a sleep cap, is still needed.

## Never invent facts

Do not bake names, dates, prize amounts or registration counts into images. The
downloaded winner shot came with a made-up winner and a made-up cheque, which had to be
cropped out. Any text in a generated image will eventually disagree with `site.ts`.