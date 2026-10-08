# Design Plan

One memorable thing: **the page is one night.** You scroll from dusk to midnight
to dawn, and a mint heartbeat line runs through it — spiky while you are awake,
flat once you are asleep deeply. Everything else stays quiet so that idea lands.

---

## 1. Palette

Named hex values. Stitch wins where it specifies, the brief wins for content.

| Token | Hex | Role |
|---|---|---|
| `--color-midnight` | `#0B0620` | Page ground, deepest sky |
| `--color-indigo` | `#1B1450` | Cards, panels, sky mid |
| `--color-dusk` | `#3A2C78` | Borders, 1px strokes, sky top at midnight |
| `--color-cream` | `#FFF8E7` | Primary text, the Reserve card ground |
| `--color-lavender` | `#D9D2FF` | Secondary text, unfilled ECG spikes |
| `--color-zzz` | `#FFE14A` | Cash, key numbers, focus ring, "WIN $100,000" |
| `--color-pillow` | `#FF4F8B` | Primary CTA, sticker shadows |
| `--color-dawn` | `#FF9A3C` | Sunrise, squad backdrop, dawn sky |
| `--color-mint` | `#35F2B0` | Heartbeat line, registered fill, success |
| `--color-ink` | `#1A0B12` | Text on pink, card outlines |

Text on pink is `#1A0B12` (not white) — Stitch's own `on-primary` is `#66002d`,
and a dark ink reads better against `#FF4F8B` for the long CTA labels.

Sky variables `--sky-top`, `--sky-mid`, `--sky-bottom` live on `:root` and are
written by the 3D scene, so the CSS-only fallback matches the WebGL version
exactly.

## 2. Type roles

- **Display** — Rubik 900. The Stitch export sets display type in Rubik at weight
  900 with tight leading, and its PNGs are the acceptance gate, so Rubik wins
  over the brief's Titan One suggestion. Chunky and rounded enough to read as the
  "inflatable" voice. 72/76 desktop, 44/48 mobile.
- **Body** — DM Sans 400/500/700. 18/28 large, 16/24 default, 14/20 small.
- **Data** — Space Mono. Every number that matters: the counter, the prizes, the
  mat number, `$39.99`. Mono digits stop the count jittering as they animate.

Line length capped at 80ch. Display type is tight (-0.02em) and never
centre-aligned for more than two lines.

## 3. Shape and elevation

Radius varies by hierarchy instead of being uniform:

- Sticker buttons: full pill, 3px ink border, 6px hard offset in Zzz yellow or
  10px in pillow pink. Pressing translates 3px and the shadow shrinks — the
  button sinks into its own shadow.
- Glass cards: 28px radius, 1px dusk border, indigo translucent fill. Backdrop
  blur only on the high tier.
- Sticker cards (squad rounds): 24px radius, tilted between -3 and 3 degrees,
  hard pink offset shadow.
- The Prize podium is CSS 3D perspective, visually nothing like the glass cards —
  it is the one place chrome is allowed to be structural.

## 4. Layout concept

Fixed 3D scene behind, DOM above. Content max width 1180px, transparent
sections so the sky shows through, opaque only where text must win: the squad
backdrop, the Reserve card, the FAQ panel.

```
HERO  #hero
+--------------------------------------------------------------+
| (nav pill)                        moon in nightcap .........  |
|                                              Zzz Zzz Zzz     |
|  CAN YOU SLEEP                       +-----------------+     |
|  THROUGH ANYTHING?                    |                 |     |
|  Air horns. Feathers. Bacon.          |   sleeper on    |     |
|  90 minutes. The deepest sleeper     |   cloud + mat   |     |
|  in America wins $100,000.           |   (hero poster) |     |
|                                       +-----------------+     |
|  [ Reserve my spot - $10 ]  Bring        WIN $100,000        |
|  $39.99 total. $10 now, $29.99 after   (tilted -6deg)       |
|  the date is announced.                                    |
+--------------------------------------------------------------+

COUNTER  #counter
+--------------------------------------------------------------+
|        SLEEPERS REGISTERED SO FAR                           |
|   142,855 / 200,000        <- Space Mono, zzz, counts up     |
|   ~~~~/\/\__/\/\~~~~  <- mint filled, lavender spikes        |
|   The second we hit 200,000, the contest is on.             |
|   [ Reserve my spot - $10 ]  [ Bring a friend ]             |
+--------------------------------------------------------------+

HOW IT WORKS  #how   (pinned horizontal rail on desktop)
+--------------------------------------------------------------+
|  01 .......... 02 .......... 03 .......... 04 ...........    |
|  [card]        [card]        [card]        [card]           |
|  Reserve $10   Pajamas       Sleep 90 min  Beat the squad   |
+--------------------------------------------------------------+

SQUAD  #sqad   (opaque dawn-orange backdrop)
+--------------------------------------------------------------+
|  MEET THE WAKE-UP SQUAD                                      |
|   +---------+   +---------+   +---------+                    |
|   | NOISE   |   | TICKLE  |   | SMELL   |   tilted  -3/0/3 |
|   | air horn|   | feather |   | bacon   |                    |
|   | ~~/\/\~~|   | ~~/\/\~~|   | ~~/\/\~~|   heart-rate strips |
|   +---------+   +---------+   +---------+                    |
|   [ Run the rounds again ]                                  |
+--------------------------------------------------------------+

PRIZES  #prizes
+--------------------------------------------------------------+
|  2nd      |  1st GRAND  |  3rd        <- CSS 3D podium       |
|  silver   |  $100,000  |  bronze                         |
|           |  4th  |  5th      |     [ The price ] card         |
+--------------------------------------------------------------+

RESERVE  #reserve   (cream card, ink border, pink offset shadow)
+--------------------------------------------------------------+
|   CLAIM YOUR MAT            +----------------------------+   |
|   full name   email         | THE PRICE  $39.99          |   |
|   mobile      dob           | $10 today to reserve       |   |
|   city/state  [x] consent   | $29.99 once date announced |   |
|   [ Pay $10 and I'm in ]    +----------------------------+   |
+--------------------------------------------------------------+

CTA  #cta
+--------------------------------------------------------------+
|              sun rising behind a ringing alarm clock         |
|              Think you can out-sleep America?                |
|              [ Reserve my spot - $10 ]                      |
+--------------------------------------------------------------+
```

Mobile: every rail and grid collapses to one column; the squad becomes a
scroll-snap carousel with a peeking next card; the podium stacks and keeps its
order; a sticky bottom bar carries the Reserve CTA and hides while `#reserve`
is on screen.

## 5. Principles

1. **One orchestrated moment per section.** Each section gets one animation that
   answers the visitor: the counter counts up, the squad plays its rounds, the
   prize rolls. Everything else stays still. No fade-and-slide-up on every block.
2. **The heartbeat is the through-line.** It appears as the progress bar in the
   counter, as the mini strips in the squad cards, and as the ticket. Awake =
   spikes, asleep = flat. This is also how the contest is scored, so the motif
   is the argument, not decoration.
3. **The sky tells the time.** Dusk pink at the hero, indigo at midnight, dawn at
   the CTA. Interpolated from scroll position, never snapped.
4. **Text is always in code.** Images carry illustration only. Where a downloaded
   asset has baked-in chrome, crop it (`CROPS` in `scripts/optimize-images.mjs`)
   rather than ship a slogan inside a JPEG.
5. **Every tier is a real design.** No-WebGL is a composed night, not a blank
   space. Reduced motion is calm and complete, not stripped.
6. **Restraint.** One particle-ish idea (stars) and it serves the night. No
   generic particle fields, no hover-wobble on everything.