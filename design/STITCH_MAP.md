# Stitch Export Map

Read-only reference. The original export lives in `stitch_workspace_starter_project/`;
a copy is kept in `design/stitch/` and is never edited. Raw downloads sit in
`design/stitch/raw/`.

## Files

| Path | Kind | Notes |
|---|---|---|
| `the_great_america_s_sleep_contest_landing_page/code.html` | Home (desktop), 71 KB | The canonical screen. Tailwind CDN, inline config, 12 remote images. |
| `the_great_america_s_sleep_contest_landing_page/screen.png` | Home screenshot | 302 KB. **Visual truth** for spacing, hierarchy and composition. |
| `the_great_america_s_sleep_contest_interactive_3d_experience/code.html` | Home variant, 84 KB | Same section order and copy; differs only in hero image and some 3D-experiment copy. |
| `the_great_america_s_sleep_contest_interactive_3d_experience/screen.png` | Home screenshot | 290 KB. Hero image slot renders as a placeholder here. |
| `glossy_toy_like_3d_render.../screen.png` | Image-generation reference | 1.2 MB. The glossy clay 3D style target for all generated art. |
| `midnight_slumber_arcade/DESIGN.md` | Design system | Colour, type, spacing, radius source of truth. |
| `three.js/code.html` | Three.js experiment, 9 KB | Standalone scroll/3D spike. Superseded by the App Router + R3F architecture. |
| `sleep_contest_3d_website_research..._{1,2}.md` | Research pack | Duplicated file; strategy background only. |

There is **no** success-ticket, rules, referral or form-state screen in the export.
Those are built from Sections 1 and 7 of the master prompt.

## Screen classification

| Stitch id | Our section | Stitch id (source) | Notes |
|---|---|---|---|
| hero | S1 Hero | first `<section>`, no id | H1, sub, CTA, price line, tilted prize badge |
| counter | S2 Counter | `#counter` | "Sleepers Registered So Far" |
| how | S3 How it works | `#how-it-works` | "How America's Deepest Sleeper Wins" |
| squad | S4 Wake-up squad | `#wake-up-squad` | "Meet the Wake-Up Squad" |
| prizes | S5 Prizes | `#prize-podium` | "The $167,500 Cash Purse" |
| gallery | S6 Gallery | `#gallery` | "What It Actually Looks Like" |
| reserve | S7 Reserve | `#register` | "Claim Your Sleeping Mat" |
| faq | S8 FAQ | `#rules-and-faq` | "Frequently Asked Questions" |
| cta | S9 Final CTA | section before `<footer>` | "Think you can out-sleep America?" |

Anchors differ from ours: Stitch uses `#how-it-works`, `#wake-up-squad`,
`#prize-podium`, `#register`, `#rules-and-faq`. We keep the master prompt's ids
(`#how`, `#squad`, `#prizes`, `#reserve`, `#faq`) and update nav links to match.

## Design tokens extracted from the inline `tailwind.config`

Fonts: `Rubik` (display/headings, up to 900), `DM Sans` (body), `Space Mono`
(labels and numbers), plus `Material Symbols Outlined` for icons.

Colour — the Stitch palette is a Material 3 set plus the brief's brand hexes.
Brand values from `DESIGN.md` and the inline config agree:

`midnight #0B0620` · `indigo #1B1450` (surface-indigo) · `dusk #3A2C78`
(border-dusk) · `cream #FFF8E7` · `lavender #D9D2FF` · `zzz #FFE14A` ·
`pillow #FF4F8B` (primary-container) · `dawn #FF9A3C` · `mint #35F2B0`
(tertiary `#07e1a1`) · `ink #1A0B12` (on-primary `#66002d` used as the text
colour on pink).

Type scale: display-hero 72/76 (mobile 44/48), headline-lg 40/46 (mobile 30/36),
headline-md 28/34, headline-sm 22/28, body-lg 18/28, body-md 16/24,
body-sm 14/20, label-mono-lg 18/24, label-mono-md 14/18, label-mono-sm 12/16.

Radius: sm 0.5rem, DEFAULT 1rem, md 1.5rem, lg 2rem, xl 3rem, full 9999px.
Spacing: gutter 1.5rem (mobile 1rem), margin 3rem (mobile 1.25rem),
space-xs/sm/md/lg 0.25/0.5/1/1.5rem, space-xl 2.5rem.

**Stitch wins** these spacing and radius values (master prompt Section 6).

Custom CSS in the export worth keeping: `shadow-arcade-button` (4px offset, 2px
on hover), a 24 s `marquee` keyframe, and the ticker utility.

## Images

Thirteen remote `lh3.googleusercontent.com` URLs. Twelve are real images; one
returns an HTML page and is logged as a failure in `IMAGE_MANIFEST.json`.

| Our key | Downloaded as | Alt text in the export |
|---|---|---|
| (reference only) | `logo-reference` | Sleepy Moon Logo — has the word "rubik" baked in, never shipped |
| `hero.poster` | `hero-poster` | sleeper on cloud mattress, crescent moon in a nightcap, yellow Zzz balloons |
| `how.1` | `how-1-register` | arena floor of illuminated inflatable mats |
| `how.2` | `how-2-pajamas` | referees with train-horn megaphones |
| `how.3` | `how-3-leaderboard` | referee hovering a feather over a sleeping contestant |
| `how.4` | `how-4-feather` | chef wafting bacon and waffles over sleepers |
| `squad.noise` | `squad-noise` | domed arena packed with glowing mats |
| `squad.tickle` | `squad-tickle` | referee testing an eyelash with a feather |
| `squad.smell` | `squad-smell` | jumbotron with sleep telemetry charts |
| `gallery.1` | `gallery-sleeping-floor` | contestant in a marshmallow-monster onesie |
| `gallery.2` | `gallery-squad-closeup` | squad tiptoeing past sleepers |
| `gallery.3` | `gallery-judge` | winner with a giant cheque under spotlights |

Note the export's own ordering is shifted: `how-2-pajamas` shows referees, not
pajamas, and `squad-smell` shows the leaderboard, not bacon. We map by subject
and rename on download (`scripts/fetch-stitch-images.mjs`), so the keys above are
ours, not the export's.

### Baked-in text

Every downloaded image contains rendered text — logos, nav, headlines, buttons,
and in `gallery-judge` a fabricated cheque with an invented winner name and
amount. The brief requires that all text be rendered in code, never baked into
an image, and forbids inventing facts. `scripts/optimize-images.mjs` therefore
crops the chrome out (`CROPS`), keeps raw files untouched in `raw/`, and emits
WebP/AVIF with blur placeholders. Images still carrying in-scene signage are
listed in `ASSETS_TO_GENERATE.md` for regeneration.