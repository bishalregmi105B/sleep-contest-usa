# Photographic assets

**The site currently ships with no photographs at all, and that is a valid state,
not a broken one.**

Every image slot falls back to a dark cinematic frame with film grain, so the
page reads as an unlit corner of the night rather than as a placeholder box.
There is no cartoon or illustration anywhere on the site, which means it cannot
regress into looking like one.

Drop a file into `public/assets/` and it is picked up automatically on the next
`npm run assets:scan` (which runs on `predev` and `prebuild`). No code change.

## Why there are no photographs yet

The old images were glossy clay-and-inflatable 3D renders: a sleeping infant in a
striped nightcap, a smiling moon in a nightcap, extruded yellow "Zzz" letters.
They were moved to `design/archive/stitch-cartoon/` and are reference only.

The replacement brief is **"midnight documentary"**: night-time event
photography, lit by practical tungsten work lights and cool moonlight. Real over
rendered. Photographic imagery and light carry the page; code-driven graphics are
limited to data (the heartbeat), atmosphere (stars, moon, dust, light shafts) and
typography.

## How to generate them

```bash
# One command, if GEMINI_API_KEY is set. Writes WebP + AVIF, never overwrites.
GEMINI_API_KEY=... npm run images:generate

# Or a subset, by key:
GEMINI_API_KEY=... npm run images:generate -- cine/k1 squad-noise
```

Without a key the script prints a note and exits. That is expected.

Prompts live in `scripts/image-prompts.json`. Every one of them is the style lock
below plus a subject line, and the file is the single source of truth for the
copy, the size and the output path.

**Generated images are AI output and the site labels them "Concept visual".**
They need a human review before launch: check faces, hands, any accidental text
or logo in frame, and that each image actually matches its caption. The old
gallery had a feather on the "leaderboard" step and a chef with bacon on the
"feather" step, which is the specific failure to check for.

## Style lock v2

> Generate a photograph, not an illustration. Documentary event photography at
> night, shot on a full-frame mirrorless camera, 35mm lens at f/1.4 (or 85mm
> f/1.8 for close-ups), ISO 3200, slight natural film grain, honest imperfections
> (uneven light, slight asymmetry, mild motion softness). Lit by practical warm
> tungsten work lights and cool moonlight. Low-contrast, lifted indigo shadows,
> natural skin tones, muted color. Fictional adult people, eyes closed when
> sleeping. Clean frame with no text, no numbers, no logos, no brand marks.

Describe what you want positively; many image models ignore negative prompts.
Avoid the words *perfect*, *flawless* and *beautiful*.

Sleeping subjects with closed eyes avoid the uncanny valley, which suits this
contest well. People are adults, diverse, in ordinary pajamas. No inflatable
costumes, no mascots, no characters of any kind.

## Grade

Every raster must share one grade so six photographs read as one night:

- lifted indigo shadows, warm tungsten highlights
- low-to-medium saturation, natural skin tones
- no heavy teal-and-orange grade
- mix of wide establishing shots, medium candid frames and macro details
- every image unique, and matched to its caption

## What is needed

### Tier 1 — keyframes (2400 × 1350)

These six carry the whole dusk-to-dawn story. Keep the subject inside the centre
60% so a portrait crop still works.

| Key | Section | Subject |
| --- | --- | --- |
| `cine/k1` | hero | Wide shot of an open-air stadium at dusk from outside a gate, a long line of people in pajamas carrying pillows, sky fading from burnt amber at the horizon to deep indigo, a pale moon, warm light spilling from the gate |
| `cine/k2` | counter | Aerial drone view at night of a stadium field covered in thousands of neat rows of sleeping mats, soft warm aisle lights, light haze, a few people lying down |
| `cine/k3` | how | Low-angle view along an aisle of sleeping mats, people asleep on both sides, strings of warm lights overhead, shallow depth of field |
| `cine/k4` | squad | Close-up of a sleeping adult's face in profile on a mat, eyes closed, a small heart-rate clip on the ear lobe glowing faintly green, cool moonlight and a warm rim light |
| `cine/k5` | reserve | Blue-hour view of the same field, mats catching the first cool light, mist at ground level, a distant stadium rim |
| `cine/k6` | cta | Sunrise over the stadium field, low sun flaring through haze, long warm light across rows of mats, a few people stretching awake |

### Tier 1 — section stills (1600 × 1200)

| Key | Subject |
| --- | --- |
| `how-1-register` | A hand holding a phone at night, screen glow on the face, screen content blurred and unreadable |
| `how-2-pajamas` | Flat-lay of folded pajamas, a pillow and a rolled mat on a wooden floor, warm lamp light |
| `how-3-leaderboard` | Macro of a fingertip heart-rate clip glowing softly, shallow depth of field |
| `how-4-feather` | Silhouette of a referee in a striped shirt in a mat aisle holding an air horn, backlit, face not visible |
| `squad-noise` | Product-style macro of a vintage air horn on a dark surface with a hard rim light |
| `squad-tickle` | Extreme macro of a feather held above a sleeper's closed eyelashes |
| `squad-smell` | Bacon sizzling in a pan with backlit steam, a steaming coffee cup behind |
| `gallery-1` | Wide aerial of the mats |
| `gallery-2` | Candid close of two friends asleep in ordinary pajamas, one hugging a pillow |
| `gallery-3` | A referee's hand holding a feather over a sleeping contestant, face out of focus |
| `gallery-4` | A large dark screen glowing with abstract green heart-rate lines, no text or numbers, silhouettes in front |
| `gallery-5` | A squad member walking an aisle, air horn silhouette backlit |
| `gallery-6` | Steam rising across warm lights at the edge of the field |

**Prizes need no imagery** — the section is typographic by design. **The OG image
and favicon are drawn in code** so they can never drift from the palette.

### Tier 2 — optional video

One continuous 10 to 12 second master, "a night at the stadium, dusk to dawn":
slow push-in from the gate (k1), over the field (k2), down the aisle (k3), onto
the sleeper's face (k4), blue hour (k5), sunrise (k6). Generate it from the
keyframes with any image-to-video model, 8 second clips stitched with
cross-dissolves. Then:

```bash
# Desktop sequence, about 120 frames at 12fps
ffmpeg -i master.mp4 -vf "fps=12,scale=1280:-2" \
  -c:v libwebp -q:v 70 -compression_level 6 \
  public/assets/sequence/desktop/f_%04d.webp

# Mobile sequence
ffmpeg -i master.mp4 -vf "fps=12,scale=720:-2" \
  -c:v libwebp -q:v 62 -compression_level 6 \
  public/assets/sequence/mobile/f_%04d.webp

# Hero loop for the first screen, with k1 as the poster
ffmpeg -i master.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an \
  -t 10 public/assets/video/hero-loop.webm
ffmpeg -i master.mp4 -c:v libx264 -crf 26 -preset slow \
  -movflags +faststart -an -t 10 public/assets/video/hero-loop.mp4
```

Budgets: hero still 300 KB or less (WebP); mobile sequence 3 MB or less; desktop
sequence 8 MB or less, loaded on idle at low priority.

> **Not yet wired.** The current build draws its sky in CSS and does not yet read
> a frame sequence. Dropping frames into `public/assets/sequence/` will not change
> anything on their own — see `REALISM_REPORT.md`, which records this as the one
> deferred item and why.

## Optional: the moon colour map

A public-domain NASA moon colour map at `public/assets/images/moon-color.webp`
(2k) will replace the procedural crater shader. Until then the procedural crescent
is what ships, and it looks right.

## Reference

`design/stitch/` holds the original Stitch exports, kept only to show what the
site looked like before. `design/archive/stitch-cartoon/` holds the old cartoon
rasters. Neither is served.