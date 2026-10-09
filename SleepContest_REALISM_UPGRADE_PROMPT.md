# THE GREAT AMERICA'S SLEEP CONTEST: REALISM UPGRADE (MASTER PROMPT FOR AN AI CODE EDITOR)

> How to use: open the existing repo (`bishalregmi105B/sleep-contest-usa`) in your AI code editor (Claude Code, Cursor, Windsurf, opencode, Copilot agent), add this file to the project root as `REALISM_PROMPT.md`, and say:
> **"Read REALISM_PROMPT.md completely, then execute it end to end in autopilot. Do not stop until Section 11 (Definition of Done) is met."**

---

## 0. MISSION, MODE AND RULES

**Context.** The site is already built and live (Next.js App Router, one persistent R3F canvas, mock checkout, ticket, friends, admin, rules pages; deployed at sleep-contest-usa.vercel.app). The client's feedback: **"it looks like a cartoon, it needs reality."**

**Mission.** Transform the whole site from a toy-like, illustrated look into a **cinematic, photographic, premium look** without breaking anything that works. Keep the concept (one night, dusk to midnight to dawn, with the heartbeat line as the motif), the structure, the copy voice and every working flow. Change what the visitor *sees and feels*.

**Realism dial: 85% real, 15% brand.** Reality carries the page (photographic imagery, real lighting, grain, data-grade UI, restrained motion). Brand personality survives only in: the indigo night base, one signal-pink CTA color, the heartbeat motif, the playful copy voice, and the gold prize color.

**Autopilot rules (follow strictly):**

1. Never ask questions, never wait for approval. When ambiguous, choose the most reasonable option, add one line to `DECISIONS.md`, continue.
2. Work on a branch `realism-upgrade`. Commit after every phase (conventional commits). Never force-push. Keep `main` deployable.
3. Do not rebuild from scratch. Read the repo first (README, `src/content/site.ts`, `src/components/**`, `src/lib/**`, `scripts/**`, `ASSETS_TO_GENERATE.md`, `DECISIONS.md`) and refactor in place. File names below are expected, not guaranteed: discover the real ones and adapt.
4. Everything that works today must still work: register, mock pay, ticket, friends, admin, rules, stats, SEO routes, quality tiers, reduced motion, tests.
5. **Never ship a cartoon.** If a photoreal asset is not available yet, the page must fall back to a dark cinematic gradient with grain and vignette, never to a cartoon image, clay 3D object or placeholder box.
6. **Honesty.** Realistic imagery implies a real event. Every AI-generated image is labeled as concept visuals (Section 3.7). No fake counts, no fake winners, no fake testimonials, no fake brand marks, no readable text or numbers inside images.
7. The site must still run with zero credentials, and the Vercel build must stay green.
8. Do not add heavy new dependencies. Allowed: `lucide-react`. Everything else you need is already in the repo (`sharp`, `three`, `gsap`, `lenis`, `next`).

---

## 1. DIAGNOSIS: WHY IT READS AS A CARTOON (observed on the live site and in the repo)

**Cartoon signals to remove or replace**

- **Imagery style lock is the cause.** `ASSETS_TO_GENERATE.md` instructs "glossy toy-like 3D render, soft clay and inflatable look". The shipped images follow it (a sleeper on a "cloud mattress" with a smiling moon in a nightcap and "Zzz balloons", an inflatable marshmallow-monster onesie, referees with oversized horns).
- **Toy 3D objects:** smiling moon with a sleep cap, extruded glossy yellow Zzz letters, capsule-and-sphere sleeper, procedural air horn, alarm clock, feather, bacon.
- **Typography and chrome:** puffy "inflatable" display font (Titan One), sticker buttons with hard offset shadows, randomly tilted cards, a yellow sticker badge, emoji (🏆), star separators in the ticker, a sheep-counter preloader.
- **Color usage:** candy pink and yellow used as surfaces, an orange-pink sunset gradient that no real sky produces.
- **Low-quality art:** the how-it-works, squad and gallery images are 1024 px crops of Stitch art.

**Content and technical bugs found on the live site (fix them in the same pass)**

1. Page metadata points to localhost: canonical, `og:url`, `og:image` and `twitter:image` all use `http://localhost:3000`. Set `NEXT_PUBLIC_SITE_URL` in the Vercel project settings, use it as `metadataBase`, and make the code fall back to `https://sleep-contest-usa.vercel.app` (or `VERCEL_PROJECT_PRODUCTION_URL`) when it is missing, never localhost in production.
2. **False claim:** the final CTA says "Join 200,000 Americans already registered" while the live counter shows 0 of 200,000. Replace with a truthful line driven by the real count (see Section 8).
3. Garbled copy in the live site: "Our sleep for 90 minutes is the easy part." and "Top 5 sleepers share the prize purse and paid with the grand prize complete." Rewrite both (Section 8).
4. The contact line shows `hello@sleepcontestusa.com` but links to `/friends`. It must be a `mailto:` link.
5. A field labeled "Company" is visible in the page text. If it is the honeypot, it must be visually hidden off-screen, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"`, and have no visible label. If it is a real field, remove it.
6. Image and content mismatches: step images do not match steps (step 3 "leaderboard" shows a feather; step 4 "feather" shows a chef with bacon), squad round images do not match rounds, and gallery tiles reuse `how-2`, `how-3` and `squad-noise`. Every image must be unique and match its caption.
7. The steps show both "01" and "Step 1:". Keep one numbering device.

---

## 2. RESEARCH BASIS (what "real" looks like on comparable sites)

- **2026 web design is moving toward cinematic and human.** Cinematic hero sections (video or film-like stills with a simple type overlay), film grain, dramatic lighting, title-card typography, darker compositions, shallow depth of field, candid documentary-style photography with imperfection. Mixed media is allowed: photographs with a few graphic elements on top.
- **Sleep and health-tech leaders look like instruments, not toys.** Eight Sleep: deep near-black canvas, full-bleed aspirational lifestyle photography, pin-prick bright accents like illuminated controls. WHOOP: dark, data-first, photographic, tabular numerals on every metric, score rings, leaderboard-grade numbers. Oura: photography-first warmth, restrained chrome, full-pill CTAs. Common thread: **one accent color, hairline borders, real photography, honest data visuals.**
- **Premium "3D scroll" is usually a scroll-scrubbed image sequence, not live 3D.** Frames extracted from a cinematic video are drawn to a canvas by scroll position. Practical recipe: about 12 fps, 1280 px wide WebP frames, canvas pixel ratio capped around 1.5, hero sequence loaded first and the rest lazily at low fetch priority, immutable cache headers. If a `<video>` is scrubbed instead, encode it with very frequent keyframes or it will stutter.
- **Photoreal AI images need photographic language.** Name a real camera, lens and film or sensor look; describe one specific light source instead of "cinematic lighting"; add honest imperfections (grain, slight asymmetry, uneven light); avoid the words perfect, flawless and beautiful; describe positively because many image models ignore negative prompts. For Nano Banana (Gemini image), start the prompt with "Generate a photograph, not an illustration." **Sleeping subjects with closed eyes avoid the uncanny valley**, which suits this contest.
- **Where live 3D still helps, realism comes from lighting and restraint:** HDRI image-based lighting, PBR materials, soft contact shadows, one tone-mapping stage (not two), a short post-processing ladder, subtle depth of field, no bounce.

---

## 3. ART DIRECTION v2: "MIDNIGHT DOCUMENTARY"

### 3.1 Principle
Real over rendered. A night-time event documentary with title-card typography. Photographic imagery and light carry the page; code-driven graphics are limited to **data (heartbeat, telemetry), atmosphere (stars, moon, dust, light shafts) and typography.**

### 3.2 Color tokens (update `@theme`; keep old names as aliases only while migrating, then delete)

| Token | Value | Use |
|---|---|---|
| ink | `#07060F` | deepest background, scrims |
| midnight | `#0B0620` | page base |
| indigo | `#1B1450` | rare section tint, never a flat card fill |
| paper | `#F3EBDD` | primary text (replaces cream) |
| mist | `#B9B4D6` | secondary text |
| tungsten | `#FFB867` | warm practical light: glows, hover, dawn |
| foil | gradient `#F5D77A` to `#C9953C` to `#F5D77A` | prize numbers only |
| signal | `#E8467F` | the single CTA color (text on it: `#1A0B12`) |
| mint | `#35F2B0` | heartbeat and live data only |

Retire candy yellow as a surface and the orange-pink sky gradient. Realistic sky stops: horizon `#C9743A` fading to `#3A2C78` to `#0B0620` (dusk), `#0B0620` (night), `#2A3A66` to `#E9A66A` (pre-dawn and dawn).

### 3.3 Typography
- Display: a confident condensed title-card face. Default **Big Shoulders Display** (700 to 900) via `next/font/google`; if unavailable use Barlow Condensed, then Anton. Mostly uppercase for H1 and H2, line-height 0.92, `text-wrap: balance`, `letter-spacing: -0.01em`. No puffy fonts.
- Body: DM Sans (keep). Numbers and telemetry: **JetBrains Mono with `font-variant-numeric: tabular-nums`** everywhere a number changes.
- Line length under 80 characters; clear scale; no tracked-out all-caps eyebrow above every heading.

### 3.4 Shape, chrome, texture
- Cards: 10 to 14 px radius, `bg-white/[0.04]`, 1 px `border-white/10`, layered soft shadow (`0 1px 0 rgba(255,255,255,.06) inset, 0 24px 60px -24px rgba(0,0,0,.85)`), subtle backdrop blur on high tier only.
- Buttons: primary is a solid `signal` pill with a soft realistic shadow and a 1 px inner highlight, pressed state translates 1 px; secondary is a hairline outline. **No hard offset shadows, no sticker look, no tilt, no emoji.**
- Icons: `lucide-react` monoline, 1.5 px stroke.
- **FilmGrain:** fixed full-screen overlay, `pointer-events: none`, tiny noise tile or inline SVG turbulence, opacity 0.05 to 0.07, `mix-blend-mode: overlay`, stepped animation at about 8 fps. Off for reduced motion and on the `low` tier. **Vignette:** radial gradient overlay, 25 to 35% at the corners. These two layers do most of the "film" work; do not also add a post-processing Noise pass.
- Ticker: thin single line, separators are a thin slash or dot, no star glyphs.

### 3.5 Imagery rules (the "photographic bible")
- All rasters are **photographs** (generated or real). Consistent grade: lifted indigo shadows, warm tungsten highlights, low-to-medium saturation, natural skin tones. Avoid heavy teal-and-orange grading.
- Mix of wide establishing shots, medium candid frames and macro details. Every image is unique and matches its caption.
- People: adults only, diverse, candid, **eyes closed while sleeping**, ordinary pajamas (no inflatable costumes, no mascots). Faces fictional and non-identifiable.
- No text, numbers, logos or brand marks inside any image. All words are rendered in code.

### 3.6 Motion rules
Cinematic, slow, physical. Easing `power2.inOut`, `power3.out`, `expo.out`. Durations 0.8 to 1.4 s for reveals, scroll scrub 0.8 to 1.2. Parallax depth at most about 4%. Slow camera drift instead of idle bounce. **Remove** `elastic`, `back`, wobble, random tilt, breathing-pillow loops, sheep preloader. Hero text enters like a title card (fade, slight blur-in, letter-spacing settles) once at load, nothing else auto-plays.

### 3.7 Honesty labels
A small, legible "Concept visuals" caption appears wherever AI-generated imagery is shown (gallery, hero credit line in the footer, OG image alt text), and the gallery heading stays "What it will look like". Never show a winner, a real prize cheque, or crowd numbers. Never imply the images are photos of a past event.

---

## 4. KEEP, REPLACE, DELETE

**Keep:** the section structure and order, all copy except the fixes in Section 8, the dusk-to-midnight-to-dawn arc, the heartbeat motif and live counter semantics, `site.ts`, the asset scan pipeline, quality tiers, reduced-motion paths, all backend routes and flows, accessibility work, tests.

**Replace:**
- Fonts and color tokens (3.2, 3.3). Button, card, badge and ticker styling (3.4).
- The hero and the whole scroll scene: the toy 3D world becomes a **cinematic sequence plus atmosphere** (Section 6).
- How-it-works, squad and gallery imagery (Section 5).
- DOM podium with emoji becomes a **typographic prize ladder** on a dark stage with a warm light beam (Section 6.5).
- The sheep preloader becomes a 1.2 s "lights down" fade.
- The heartbeat path becomes an **authentic ECG waveform** (P wave, QRS spike, T wave) and the squad strips and counter use it.
- Ticket page: a realistic printed boarding pass (paper texture, perforation, clean type). Favicon and OG: no face on the moon, a plain moon and title card.

**Delete when done:** smiling moon and sleep cap, Zzz letters, capsule sleeper, toy props (horn, clock, feather, bacon), tilt classes, sticker utilities, hard-shadow tokens, Titan One, emoji, star separators, the Stitch-derived cartoon images in `public/assets/images`, the `CROPS` logic in `scripts/optimize-images.mjs`. Keep the original Stitch exports in `design/stitch/` as reference only.

---

## 5. THE PHOTOREAL ASSET PROGRAM

### 5.1 Style lock v2 (replaces the old one in `ASSETS_TO_GENERATE.md`)
Put this at the top of every image prompt:

> **Generate a photograph, not an illustration.** Documentary event photography at night, shot on a full-frame mirrorless camera, 35mm lens at f/1.4 (or 85mm f/1.8 for close-ups), ISO 3200, slight natural film grain, honest imperfections (uneven light, slight asymmetry, mild motion softness). Lit by practical warm tungsten work lights and cool moonlight. Low-contrast, lifted indigo shadows, natural skin tones, muted color. Fictional adult people, eyes closed when sleeping. Clean frame with no text, no numbers, no logos, no brand marks.

Describe what you want positively (many image models ignore negative prompts). Avoid the words perfect, flawless and beautiful.

### 5.2 Keyframe stills (Tier 1, required). These carry the whole dusk-to-dawn story
Save as `public/assets/images/cine/k1.webp` to `k6.webp`, 2400x1350 (also a 1200x1350 portrait-crop-safe composition: keep the subject in the center 60%).

| Key | Section | Prompt (subject and light) |
|---|---|---|
| k1 | hero | Wide shot of an open-air stadium at dusk from outside a gate, a long line of people in pajamas carrying pillows, sky fading from burnt amber at the horizon to deep indigo, a pale moon, warm light from the gate |
| k2 | counter | Aerial drone view at night of a stadium field covered in thousands of neat rows of sleeping mats, soft warm aisle lights, light haze, a few people lying down |
| k3 | how | Low-angle view along an aisle of sleeping mats, people in pajamas asleep on both sides, strings of warm lights overhead, shallow depth of field |
| k4 | squad | Close-up of a sleeping adult's face in profile on a mat, eyes closed, a small heart-rate clip on the ear lobe glowing faintly green, cool moonlight and a warm rim light |
| k5 | reserve | Blue-hour view of the same field, the mats catching first cool light, mist at ground level, a distant stadium rim |
| k6 | cta | Sunrise over the stadium field, low sun flaring through haze, long warm light across rows of mats, a few people stretching awake |

### 5.3 Section imagery (Tier 1, required)
All 1600x1200 `webp` in `public/assets/images/`. Same lock, same grade.

- **How it works (4):** `how-1-register.webp` a hand holding a phone at night, screen glow on the face, screen content blurred and unreadable; `how-2-pajamas.webp` flat-lay of folded pajamas, a pillow and a rolled mat on a wooden floor, warm lamp light; `how-3-leaderboard.webp` macro of a fingertip heart-rate clip glowing softly, shallow depth of field; `how-4-feather.webp` silhouette of a referee in a striped shirt in a mat aisle holding an air horn, backlit by warm lights (face not visible).
- **Squad (3):** `squad-noise.webp` product-style macro of a vintage air horn on a dark surface with a hard rim light; `squad-tickle.webp` extreme macro of a feather held above a sleeper's closed eyelashes; `squad-smell.webp` bacon sizzling in a pan with backlit steam and a steaming coffee cup in the background.
- **Gallery (6, unique):** `gallery-1.webp` wide aerial of the mats; `gallery-2.webp` candid close of two friends asleep in ordinary pajamas, one hugging a pillow; `gallery-3.webp` a referee's hand holding a feather over a sleeping contestant (face out of focus); `gallery-4.webp` a large dark screen glowing with abstract green heart-rate lines, no text or numbers, silhouettes in front; `gallery-5.webp` squad member walking an aisle, air horn silhouette backlit; `gallery-6.webp` steam rising across warm lights at the edge of the field.
- **Prizes:** no imagery needed (typographic). **OG:** crop of k1 with the title set in code.

### 5.4 Cinematic sequence (Tier 2, preferred)
One continuous 10 to 12 second master video, "a night at the stadium, dusk to dawn": slow push-in from the gate (k1 look), over the field (k2), down the aisle (k3), onto the sleeper's face (k4), blue hour (k5), sunrise (k6). Generate it with any video model from the keyframes (image-to-video, 8 s clips stitched with cross-dissolves). Then extract frames:

```bash
# desktop set (about 120 frames)
ffmpeg -i master.mp4 -vf "fps=12,scale=1280:-2" -c:v libwebp -q:v 70 -compression_level 6 public/assets/sequence/desktop/f_%04d.webp
# mobile set
ffmpeg -i master.mp4 -vf "fps=12,scale=720:-2"  -c:v libwebp -q:v 62 -compression_level 6 public/assets/sequence/mobile/f_%04d.webp
```

Also export a hero loop for the first screen: `hero-loop.webm` (VP9, `-crf 34 -b:v 0 -an`) and `hero-loop.mp4` (`libx264 -crf 26 -preset slow -movflags +faststart -an`), 720p, 2 MB or less, with `k1` as the poster.

Budgets: hero still 200 KB or less (AVIF) or 300 KB (WebP); mobile sequence 3 MB or less; desktop sequence 8 MB or less, loaded on idle at low priority; with `saveData` or `prefers-reduced-motion` load stills only.

### 5.5 Optional: let the editor generate the stills
If `GEMINI_API_KEY` is set in the environment, add `scripts/generate-images.mjs` that reads prompts from `scripts/image-prompts.json` (built from 5.1 to 5.3), calls Google's image generation API (check the current model id in Google's docs, e.g. via the models list endpoint, rather than hardcoding one), converts results with `sharp` to WebP and AVIF, writes to the paths above, and never overwrites an existing file. If the key is absent, skip silently and rely on `ASSETS_TO_GENERATE.md`. Generated files need human review before launch.

---

## 6. THE NEW SCENE AND SECTION-BY-SECTION CHANGES

### 6.1 Layer stack (all fixed, behind the DOM, in this order)

1. **L0 `CinematicStage`**: a 2D `<canvas>` that draws the current frame of the cinematic sequence (or crossfades the keyframe stills), cover-fit, with slow scroll-linked scale and pan (at most 4%).
2. **L1 `Atmosphere`**: a transparent R3F canvas (the existing single-canvas setup, reused) that draws only stars, a photoreal moon, dust motes and light shafts (6.2). Skipped on `low` and `none` tiers.
3. **L2 section scrims**: each text block sits on a local `ink` gradient scrim so text always clears the photograph (WCAG AA).
4. **L3 `FilmGrain` and `Vignette`** (3.4).

Reuse `lib/scroll-state.ts`, `ScrollBinder` and Lenis as they are; add `sequenceProgress` (0 to 1) to the scroll state. Everything is driven from the mutable scroll state, never React state.

**Sequence map (fractions of total frames, so any frame count works):**

| Section | Range | Fallback still |
|---|---|---|
| hero | 0.00 to 0.12 | k1 |
| counter | 0.12 to 0.30 | k2 |
| how | 0.30 to 0.50 | k3 |
| squad | 0.50 to 0.62 | k4 |
| prizes | hold at 0.62, dimmed to 35% | k4 darkened |
| gallery | hold at 0.62, dimmed to 25% | k4 darkened |
| reserve | 0.62 to 0.85 | k5 |
| cta | 0.85 to 1.00 | k6 |

**Loading and drawing rules**
- k1 loads first as the LCP image (`<Image priority sizes="100vw">`). On idle, preload the rest in order of need; use `createImageBitmap`, keep an LRU of at most 150 bitmaps, canvas pixel ratio capped at 1.5, redraw only when the frame index changes, driven by the GSAP ticker.
- Desktop set below 768 px width uses the mobile set. With `saveData`, `prefers-reduced-motion` or no frames present: **stills only** (crossfade between k1 to k6 with a slow Ken Burns 1.00 to 1.06 over each section's scroll range, or a simple opacity change by IntersectionObserver in reduced motion).
- If neither frames nor stills exist yet, show the dark cinematic gradient plus grain and vignette (never a cartoon, never a grey box).
- `next.config` headers: `Cache-Control: public, max-age=31536000, immutable` for `/assets/sequence/*` and `/assets/images/cine/*`.

### 6.2 Atmosphere (L1): what remains of the 3D
Delete every toy object (smiling moon and cap, Zzz letters, capsule sleeper, horn, clock, feather, bacon, balloons). Keep only:
- **Stars:** 900 (high) or 450 (med), 0.6 to 1.8 px, power-law brightness (a few bright, most faint), very slow scintillation. No twinkle bounce.
- **Moon:** hero only, top right, a textured sphere with **no face and no cap**. Use a public-domain NASA moon color map at 2k if present at `public/assets/images/moon-color.webp`, otherwise a procedural fbm-crater shader lit as a waxing crescent from the left. Subtle glow, no bloom pass.
- **Dust motes:** 120 (high) or 60 (med) `Points`, size about 0.02, opacity 0.25, slow drift, brighter inside light shafts.
- **Light shafts:** two or three additive cones in `tungsten`, opacity 0.06 to 0.12. Squad section: a 300 ms pulse per round. CTA: a ramp as dawn arrives. Prizes: one steady beam behind the grand prize number.
- Renderer: ACES tone mapping set **once** on the renderer, no EffectComposer, no extra Noise pass (the CSS grain does that).

### 6.3 Hero
- Background: k1 still (LCP). If `hero-loop` video exists and the device allows it (tier med or higher, width 768 px or more, no `saveData`, motion allowed), play the muted inline loop with k1 as the poster; otherwise the still.
- Title-card layout, lower-left third over a scrim: H1 in the display face, uppercase, `clamp(3.2rem, 9vw, 9rem)`, line-height 0.92; sub-line in `paper`/`mist`; primary `signal` pill "Reserve my spot · $10" and a secondary outline "See how it works"; the price line in mono.
- Replace the sticker badge with a hairline plaque at top right: small caption "Grand prize" above a `$100,000` numeral in the foil gradient.
- Entry: title-card reveal (fade, slight blur-in, letter-spacing settles) once at load. Bottom-left credit line "Concept visuals" in `mist`.

### 6.4 Counter and the heartbeat
- Dark panel, large JetBrains Mono tabular number "{count} / 200,000", count-up on enter (keep).
- **Rewrite `HeartbeatLine` with an authentic ECG waveform:** a path generator `ecgPath(width, beats)` that draws a flat baseline, a small P bump, a Q dip, a tall sharp R spike, an S dip and a rounded T bump per beat. The filled portion (registered / 200,000) is a flat line; the unfilled portion is the live ECG. Mint stroke with a soft glow, a faint ECG-paper grid behind at about 4% opacity, a small mint dot with a halo at the boundary (no moon marker). Keep `role="progressbar"` and the draw-on with stroke-dasharray.
- When the count is 0 show: "No sleepers yet. Be the first." (true, and invites action).

### 6.5 Prizes: a typographic prize ladder on a dark stage
Delete the DOM podium, the emoji and the confetti.
- Dark `ink` stage with one warm tungsten beam and faint haze behind the grand prize (CSS radial or conic gradient, plus the L1 shaft).
- Left: "Grand prize" caption, the `$100,000` numeral in the foil gradient at `clamp(4rem, 14vw, 14rem)`, and "For the deepest sleeper in America." Right: a ladder for 2nd to 5th, mono tabular numerals, hairline separators. Below: "Total cash purse" computed from `PRIZES` (never hardcoded).
- The numeral does an odometer-style digit roll once at 50% in view (reduced motion: final value). A subtle slow gold dust drift in L1 during this section only.
- "The price" card: hairline card, the exact copy from `site.ts`, same refund note.

### 6.6 How it works and the wake-up squad
- **How it works:** four editorial columns (stack on mobile): a 3:2 photograph with a 1 px border, a mono numeral, the heading **without** the "Step N:" prefix, the text. The pinned desktop rail may stay but slower; images use the slow Ken Burns.
- **Squad:** three photographic cards (the macro images), indigo-and-tungsten duotone overlay, hairline border, **no tilt**. Each card carries a "Round 1/2/3" label in mono and the ECG strip. "Run the rounds": a 300 ms tungsten flash overlay (opacity up to 0.18), a 2 px, 200 ms shake on the section wrapper (off for reduced motion), the three strips spike then flatten. Keep the replay button.
- Add a small **telemetry panel** under the cards: an SVG line chart of a heart rate that drops, holds steady, and shows three brief spikes at the 20-minute marks, axes in mono, with the legend **"Illustrative example, not real data."** The scoring sentence next to it must come from `site.ts` unchanged.

### 6.7 Gallery
Heading stays "What it will look like". A bento grid of six unique photographs with the same grade, 1 px borders, a 1.03 zoom on hover over 600 ms, and a mono caption "Concept visual" on each. One line under the heading: "Concept visuals generated to show what the night could look like. Real photographs follow the first event." Keep `HoverVideo` only for tiles that have real video files; otherwise no play icons.

### 6.8 Reserve and ticket
- **Reserve:** dark glass card over a dimmed k5 still with a scrim. 44 px fields, hairline borders, labels above, `tungsten` focus ring, errors in a warm red that passes AA on dark (about `#FF8A80`). `signal` pill button. The "What happens next" list uses mono numerals.
- **Ticket page:** a printed boarding pass: `paper` background with subtle noise texture, perforation cut-outs and a dashed divider, "MAT No. 000123" in mono, the registrant's first name, "Admit one sleeper", a decorative barcode (CSS gradient, `aria-hidden`), the ECG line, a print stylesheet. Replace confetti with a quiet 600 ms slide-in.

### 6.9 Header, preloader, ticker, final CTA, footer, share assets
- **Header:** translucent `ink` bar with a hairline, text wordmark in the display face with a small plain crescent glyph, links in `mist`. Hides on scroll down, shows on scroll up (keep).
- **Preloader:** black screen, wordmark fades in and out over 1.2 s, then the hero reveals. Once per session, skipped for reduced motion. Never blocks LCP.
- **Ticker:** a thin 28 px bar, mono, small caps, separators " / ", no stars.
- **Final CTA:** k6 sunrise (or the sequence end), a tungsten dawn shaft, the headline, the button, the truthful count line (Section 8). **Footer:** hairline, small type, a `mailto:` contact link.
- **OG image:** a crop of k1 with the title set in code. **Favicon and icon:** a plain crescent, no face.

---

## 7. IF ANY MESH REMAINS: REALISM HYGIENE

If you keep a 3D mesh anywhere (for example the moon), light it for form: image-based lighting with a small night HDRI at low `environmentIntensity`, PBR materials with physically plausible roughness, `ContactShadows` with `frames={1}` for static ones, one tone-mapping stage, no bounce or elastic easing, dispose geometry and materials on unmount, and keep the tier ladder and the no-WebGL fallback (stills) working.

---

## 8. COPY AND BUG FIXES (apply exactly)

Edit `src/content/site.ts` and the components that read it.

- **Final CTA body** (replaces "Join 200,000 Americans already registered..."): if `count > 0`: "{count} sleepers have reserved a spot so far. We need 200,000. Lock yours for $10 and pay the rest after the date is announced." If `count === 0`: "We need 200,000 sleepers. Be one of the first to lock a spot for $10, and pay the rest after the date is announced." Use the real count, formatted with a thousands separator.
- **How it works subtitle:** "Four steps from reserving your spot to winning the cash. Sleeping for 90 minutes is the easy part."
- **Prize intro:** "The deepest sleeper takes the $100,000 grand prize. Five sleepers get paid." Section heading keeps the computed total: "The {total} cash purse", with `total` summed from `PRIZES`.
- **Step headings:** remove the "Step N:" prefix; keep one numeral device.
- **Contact:** render `{SITE.email}` as `mailto:{SITE.email}`; fall back to a plain text line if unset.
- **Honeypot:** as in Section 1, item 5.
- **Metadata:** `metadataBase` from `NEXT_PUBLIC_SITE_URL`, falling back to `VERCEL_PROJECT_PRODUCTION_URL` (prefix `https://`) and finally the vercel.app URL. Canonical, `og:url`, `og:image` and `twitter:image` must never contain `localhost` in production. Add `NEXT_PUBLIC_SITE_URL` to `.env.example` and the README deploy notes.
- **Image alt text:** rewrite every alt for the new photographs (describe the photo; decorative layers use `alt=""`). Hero alt example: "A line of people in pajamas carrying pillows toward a stadium gate at dusk (concept visual)."
- **Images:** every image unique, every image matched to its caption.

---

## 9. EXECUTION PHASES (autopilot, in order)

After each phase run `npm run lint`, `npx tsc --noEmit`, `npm run build`, then commit.

- **R0 Recon and baseline:** create the branch, install, run, read the repo. Capture baseline screenshots at 1440x900 and 390x844 for every section into `demo/before/`. Write `REALISM_PLAN.md` confirming the diagnosis and listing the files you will touch.
- **R1 Bugs and foundations:** fix the Section 8 bugs first. Replace tokens and fonts, build the new Button, Card, Badge, Icon usage, `FilmGrain`, `Vignette`, the thin ticker. Remove sticker, tilt and emoji usage everywhere. Build green.
- **R2 Asset reset:** move every Stitch-derived cartoon image out of `public/` into `design/archive/`. Update `scripts/scan-assets.mjs`, `src/lib/assets.ts` and the generated manifest for the new keys (`cine.k1` to `k6`, `how.1` to `4`, `squad.noise|tickle|smell`, `gallery.1` to `6`, `sequence.desktop|mobile`, `video.heroLoop`, `moon.color`). Rewrite `ASSETS_TO_GENERATE.md` for Section 5 (style lock v2, prompts, filenames, ffmpeg commands). Add `scripts/image-prompts.json` and, if `GEMINI_API_KEY` exists, `scripts/generate-images.mjs` (5.5). Implement the dark cinematic fallbacks so the site looks intentional with zero new assets.
- **R3 Cinematic engine:** `CinematicStage` (L0) with sequence and stills modes, the sequence map, loading rules, headers, tiers, reduced motion. Strip L1 down to the Atmosphere (6.2) and delete the toy objects.
- **R4 Sections:** hero, counter and heartbeat, how and squad (with telemetry panel), prizes ladder, gallery, reserve and ticket, header, preloader, footer, final CTA, OG image and icon (Sections 6.3 to 6.9).
- **R5 Motion pass:** swap every easing and duration to the cinematic set (3.6), delete bounce, wobble, tilt and breathing loops, check reduced motion for every animation.
- **R6 Hardening:** axe (zero serious or critical), the **web-design-guidelines** audit over `src/**/*.tsx`, a **react-best-practices** pass, Lighthouse mobile, bundle check, Chromium, WebKit and Firefox smoke tests, WebGL-disabled test, `saveData` test. Update the Playwright tests that referenced removed elements.
- **R7 Docs and report:** update README, `DECISIONS.md`, `BUILD_REPORT.md`; write `REALISM_REPORT.md`; capture "after" screenshots into `demo/after/`; final commit and a pull request description.

**Optional skills (non-blocking; install if available, otherwise follow this document):** `anthropics/skills@frontend-design`, `vercel-labs/agent-skills@web-design-guidelines`, `vercel-labs/agent-skills@vercel-react-best-practices`, an image-prompting skill such as `hoodini/ai-agents-skills` (image-master) for the photoreal prompts, and R3F lighting and scene-polish skills (for example `EnzeD/r3f-skills`) for Section 7. Use `npx skills add <owner/repo>`.

---

## 10. REALISM RUBRIC AND AUTOMATED CHECKS

**Self-score each item pass or fail; iterate until all pass, or log the exception in `DECISIONS.md`:**

1. No illustrated, clay, inflatable or toy-3D imagery anywhere (including OG image and favicon).
2. No toy 3D objects in the scene (moon has no face; no Zzz letters, props or capsule figures).
3. Display font is not puffy; numbers use tabular mono.
4. No emoji, no star glyph separators, no tilted cards, no hard offset shadows, no sticker styles.
5. Film grain and vignette present, subtle, and disabled for reduced motion and the low tier.
6. All rasters share one photographic grade; every image is unique and matches its caption.
7. Motion is cinematic: no bounce, elastic, wobble or idle loops; reveals 0.8 to 1.4 s.
8. Data visuals are authentic: ECG waveform, tabular numerals, telemetry chart labeled illustrative.
9. Text contrast is AA over every photograph (scrims verified); keyboard focus visible; reduced motion complete.
10. Honesty: "Concept visuals" labels present; no false claims; no fake counts, winners or cheques; no text inside images.

**Run these and fix every hit:**

```bash
rg -n -i "titan|sticker|tilt|rotate\(-?[0-9]|elastic|back\.out|🏆|★|sheep|marshmallow|clay|inflatable|toy-like" src public design/stitch --glob '!design/stitch/**' --glob '!design/archive/**'
rg -n "localhost:3000" src .env.example
rg -n -i "already registered" src
rg -n "alt=\"\"" src   # confirm each empty alt is truly decorative
```

**Performance and access budgets:** LCP 2.5 s or less on mid-range mobile (the LCP element is the k1 still or H1, never a canvas); CLS under 0.1; initial transfer before the sequence about 700 KB or less; sequence budgets as in 5.4; no console errors or 404s; axe clean.

---

## 11. DEFINITION OF DONE AND REPORT

**Done means all true:**

- [ ] The site reads as a cinematic night-event documentary, not an illustration, at 1440, 820 and 390 px; the rubric is 10 of 10 or every exception is logged.
- [ ] Every Section 8 fix is applied and verified on the production build (no localhost URLs, no false registration claim, no garbled copy, working `mailto:`).
- [ ] The site looks intentional with zero generated assets (dark cinematic fallback) and upgrades automatically when the Section 5 files are dropped in.
- [ ] Register, mock pay, ticket, friends, admin, rules, stats, SEO routes, quality tiers, reduced motion and all tests still pass; lint, typecheck and build are green; Vercel deploys.
- [ ] `ASSETS_TO_GENERATE.md` lists every missing photoreal file with prompt and path; before and after screenshots exist in `demo/before/` and `demo/after/`.

**`REALISM_REPORT.md` contains:** a three-line summary; the rubric table with pass or fail; before and after screenshot paths; measured Lighthouse numbers and payload sizes; the list of assets still to generate (Tier 1 and Tier 2); decisions made; and a short **"For the client"** note covering: concept visuals are AI-generated and labeled, real event photography should replace them after the first event, and the paid-entry, cash-prize and heart-rate-result structure should be reviewed by a promotions lawyer (this is not legal advice).
