# THE GREAT AMERICA'S SLEEP CONTEST: 3D ANIMATED NEXT.JS BUILD (MASTER PROMPT)

> How to use: put this file in the project root next to the Google Stitch export, open the folder in your AI code editor (Claude Code, Cursor, Windsurf, opencode, Copilot agent) and say:
> **"Read MASTER_PROMPT.md completely, then execute it end to end in autopilot. Do not stop until Section 17 (Definition of Done) is met."**

---

## 0. MISSION, MODE AND RULES

**Role.** You are a senior creative developer, design lead and performance engineer in one. You build award-grade, scroll-driven 3D marketing sites that are also fast, accessible and production-safe.

**Mission.** Turn the Google Stitch export in this folder into a fully working, fully animated, full-screen, 3D Next.js website for **sleepcontestusa.com** ("The Great America's Sleep Contest"). It must include the real registration flow, the live counter, the extra pages, an admin view, SEO, tests and a build report. It must run locally with zero external credentials.

**Creative concept (do not dilute): "Sleep deeper as you scroll."** The page is one night. The visitor scrolls from dusk (sunset pink and orange) to midnight (deep indigo, stars) to dawn (sunrise glow and a ringing alarm). One motif runs through everything: a mint **heartbeat line** that is spiky when awake and goes flat when asleep deeply, which is also how the contest is scored. Spend boldness on that one idea and keep everything around it disciplined.

**Autopilot rules (follow strictly):**

1. Never ask questions and never wait for approval. When something is ambiguous, choose the most reasonable option, write one line in `DECISIONS.md`, and continue.
2. Do not output plans and stop. Work through the phases in Section 13 in order. After each phase, run its checks and fix every failure before moving on.
3. No stubs for core features. A feature either works end to end or is listed in `BUILD_REPORT.md` under "Needs client input" (payment keys, legal text, real photos, sponsor, deadline, email).
4. Zero-credential run: the DB is SQLite, payments use a **mock provider**, email logs to the console. Real providers switch on only when env vars are set.
5. **Precedence when sources disagree:** (a) Section 1 content facts; (b) the Stitch export for DOM layout and visual styling; (c) this document for 3D, motion, behavior and architecture; (d) skill guidance for general quality. If Stitch contradicts Section 1 (prices, prizes, copy), Section 1 wins.
6. The brief's visual direction is fixed: indigo, pink and yellow palette, chunky inflatable display type, sticker-style buttons. Design skills warn against "generic AI looks"; this brief explicitly specifies the direction, so follow the brief exactly and put your originality into composition, motion and 3D craft.
7. Never invent facts: no fake testimonials, fake registration counts, fake sponsors or fake legal claims. Placeholders stay visibly configurable (Section 1).
8. Secrets never go in the repo. Provide `.env.example` only.
9. Use npm unless a lockfile for another manager already exists. If an install fails, retry once, log it, and use the documented fallback.
10. If git exists, commit after every phase with conventional commits. Never force-push or rewrite history.

---

## 1. PROJECT FACTS (single source of truth)

Put everything below in `src/content/site.ts` (typed, exported constants). Components import from it; no copy is hardcoded in JSX.

**Identity:** The Great America's Sleep Contest · sleepcontestusa.com · organized by Sparsha LLC · contact `[EMAIL]` (placeholder).

**Event:** 200,000 Americans lie down in pajamas for 90 minutes. A wake-up squad tries to wake them. Rounds come every 20 minutes. Winner is the sleeper whose heart rate drops the most and stays steady through every wake-up round. Cities across the USA, starting with Dallas, Texas. Dates and venues are announced once 200,000 people have registered. Entrants must be 18 or older.

**Money:** total $39.99. $10 reserves a spot now; $29.99 is due after the date is announced. Full refund if the date does not suit the entrant, or if 200,000 is not reached by `[DEADLINE]`.

**Prizes (constant `PRIZES`):**

```ts
export const PRIZES = [
  { place: 1, label: "1st Prize", amount: 100000, grand: true },
  { place: 2, label: "2nd Prize", amount: 50000 },
  { place: 3, label: "3rd Prize", amount: 10000 },
  // CONFIRM WITH CLIENT: the client's message said "$5" for 4th place; $5,000 is assumed.
  { place: 4, label: "4th Prize", amount: 5000 },
  { place: 5, label: "5th Prize", amount: 2500 },
] as const;
```

**Placeholders** (`SITE.deadline`, `SITE.sponsor`, `SITE.email`) come from env (`NEXT_PUBLIC_CONTEST_DEADLINE`, `NEXT_PUBLIC_SPONSOR`, `NEXT_PUBLIC_CONTACT_EMAIL`). When empty: hide the "Presented by" clause, replace "by [DEADLINE]" with neutral wording ("If we do not reach 200,000, every reservation is refunded in full."), and show a generic contact link. Never render literal square-bracket placeholders in production.

**Approved copy (use verbatim; the Stitch export may differ slightly, this wins):**

- Ticker: REGISTRATION OPEN ★ $10 HOLDS YOUR SPOT ★ 200,000 SLEEPERS WANTED ★ WIN $100,000
- Hero H1: Can you sleep through anything?
- Hero sub: Air horns. Feathers. Bacon. 90 minutes. The deepest sleeper in America wins $100,000.
- Primary CTA: Reserve my spot · $10
- Price line: $39.99 total. $10 now, $29.99 after the date is announced.
- Counter label: Sleepers registered so far. Counter note: The second we hit 200,000, the contest is on. Bring a friend and get us there faster.
- How it works: 1 **Reserve for $10**: Lock your spot now. At 200,000 sleepers we set the date and email you first. 2 **Show up in pajamas**: You get a mat, a pillow and a heart-rate clip. Best sleepwear wins a crowd prize. 3 **Sleep for 90 minutes**: Lights drop. A giant live leaderboard shows who is sleeping deepest. 4 **Survive the wake-up squad**: Every 20 minutes they come for you. Open your eyes and you are out.
- Squad intro: Their only job is to ruin your nap. Three rounds stand between you and the cash. The noise round: Air horns, alarm clocks and one very loud rooster. The tickle round: A feather on the nose. Do not flinch. The smell round: Fresh bacon and coffee, wafted right past you.
- Prize card: For the deepest sleeper in America. (+ "Presented by {sponsor}." only if set.) Price card: $39.99; $10 today to reserve; $29.99 once the date is announced; Date doesn't suit you? Your $10 comes back in full.
- Form title: Claim your mat. Sub: The contest is confirmed once 200,000 people have registered. You must be 18 or older to enter. Consent: I am 18 or older and agree to the contest rules, waiver and being filmed. Button: Pay $10 and I'm in. Note: Full refund if the announced date doesn't suit you or the contest doesn't go ahead.
- FAQ: **When and where is it?** In cities across the USA, starting with Dallas, Texas. Dates and venues are announced once 200,000 people have registered. **Can I get my $10 back?** Yes. If the date doesn't work for you, or we don't reach 200,000 by {deadline}, you get a full refund. **How is the winner chosen?** By heart rate. The sleeper whose heart rate drops the most and stays steady through every wake-up round wins. **What do I bring?** Your pajamas and a photo ID. Mats and pillows are provided. Sleep aids and alcohol are not allowed.
- Final CTA: Think you can out-sleep America? Footer: The Great America's Sleep Contest is organized by Sparsha LLC. Contact: {email}. Links: Contest rules, Refund policy, Privacy.

---

## 2. INPUT DISCOVERY: THE STITCH EXPORT

Do this first, before writing any app code.

1. List every `*.html`, `*.png`, `*.jpg`, `DESIGN.md` and asset folder in the project root. Do not delete or edit them. **Copy** them into `design/stitch/` and treat that folder as read-only reference.
2. Classify each HTML file by screen: home (desktop), home (mobile), success ticket, rules, friend/referral, form states, others. Write the mapping in `design/STITCH_MAP.md`.
3. Stitch exports are Tailwind HTML with an inline `tailwind.config` in `<head>` plus a PNG screenshot per screen. From each file extract: the `tailwind.config` (colors, fonts, radii, shadows), the font links, every image `src`, and the section order. Treat the PNG as the **visual truth** for spacing, hierarchy and composition.
4. **Remote images:** Stitch usually hotlinks generated images from Google CDN URLs that can expire. Download every remote image referenced in the HTML now (curl or fetch script), save under `public/assets/stitch/`, convert to WebP (and AVIF for large ones) with `sharp`, and rewrite references. If a download fails, log it and generate a CSS or procedural placeholder; never ship a hotlink.
5. Do not copy the Tailwind CDN `<script>` or the Material font CDN links. Rebuild with Tailwind v4 `@theme` tokens (Section 6) and `next/font`.
6. Decompose each screen into typed React components (Section 5). Keep copy in `site.ts`, data in `content/`, logic in hooks. Match the PNG at 1440, 820 and 390 px widths before adding any animation.
7. If the folder has no usable Stitch HTML, build the design from Sections 1, 4 and 7 instead, and note it in `DECISIONS.md`.

---

## 3. SKILLS: INSTALL, LOAD, AND APPLY

### 3.1 Research basis (why this prompt is shaped this way)

- Award-style 3D sites share building blocks: 3D hero with scroll transition, preloader, custom cursor, hover effects, scroll-triggered scenes, a 3D footer. The 2026 pattern is **one strong concept, scroll-driven storytelling, mobile and accessibility handled, a static fallback shipped**. Generic particle backgrounds and template looks lose.
- Closest comparable campaign (Wakefit Sleep Internship) won on humour, human faces and lots of video, not on forms. Beast Games sells with the giant prize number and scarcity. So: prize as hero, live counter as scarcity, video and faces as proof, one main CTA.
- Next.js App Router needs a hard client boundary for WebGL: canvas in a Client Component, loaded with `next/dynamic` and `ssr: false`, never import `three` or `gsap` in a Server Component. React 19 needs React Three Fiber v9.
- Lenis plus GSAP ScrollTrigger: set Lenis `autoRaf: false`, drive `lenis.raf` from `gsap.ticker`, call `ScrollTrigger.update` on Lenis scroll, disable GSAP lag smoothing. Use `useGSAP` from `@gsap/react` for automatic cleanup.
- 3D performance: render only when needed, adapt DPR with `PerformanceMonitor`, keep assets small (GLB around 5 MB or less in total, Draco or Meshopt geometry, KTX2 or WebP textures), mutate refs inside `useFrame`, avoid per-frame allocations, instance repeated meshes, aim for under 100 draw calls on mobile.

### 3.2 Try to install these agent skills (non-blocking)

Check which skills your editor already has (Claude Code: `.claude/skills` or `~/.claude/skills`; Cursor: `.cursor/skills`; opencode: `.opencode/skills` or `.claude/skills`). Then try, adding `-y` to skip prompts and `-a <agent>` to target your editor:

```bash
npx skills add anthropics/skills@frontend-design
npx skills add vercel-labs/agent-skills@vercel-react-best-practices
npx skills add vercel-labs/agent-skills@web-design-guidelines
npx skills add vercel-labs/agent-skills@vercel-composition-patterns
npx skills add vercel-labs/agent-skills@next-best-practices
npx skills add vercel-labs/skills@find-skills
npx skills add google-labs-code/stitch-skills   # includes a Stitch-to-React components skill and design-md
```

Then use **find-skills** to search for and install the best available skills for: `threejs`, `react-three-fiber`, `gsap scrolltrigger`, `webgl performance`, `accessibility`. If installation fails or there is no network, continue: Section 4 restates the working principles.

### 3.3 When to apply each skill

| Moment | Skill or practice |
|---|---|
| Before any code | **frontend-design**: write `DESIGN_PLAN.md` (palette of named hex values, type roles, layout concept with ASCII wireframes, principles). Review the plan against the brief and revise anything generic. |
| Converting Stitch screens | **stitch-to-react / react components** approach: extract the Tailwind config into theme tokens, modular typed components, logic in hooks, data isolated, theme-mapped classes not arbitrary hex values. |
| Writing components | **vercel-react-best-practices**, **vercel-composition-patterns**, **next-best-practices**: server components by default, small client islands, no waterfalls, lazy-load heavy code, no boolean-prop sprawl. |
| 3D and scroll code | **threejs / react-three-fiber / gsap** skills if found; otherwise Section 8 rules. |
| After each phase | Self-review. At Phase 8, run a full **web-design-guidelines** audit over `src/**/*.tsx` and fix every finding. |

---

## 4. DESIGN DOCTRINE

- **Restraint.** One memorable thing (the dusk-to-dawn 3D night with the heartbeat line). Cut any effect that does not serve it. No generic particle fields, no scattered hover wobble on everything.
- **One orchestrated moment per section**, and motion that answers the visitor's action (hover, press, submit, scroll position). Avoid the default fade-and-slide-up on every block.
- **Typography carries personality.** Display: chunky, puffy, inflatable-looking face (Titan One or the closest available on `next/font/google`), uppercase only where it adds meaning, tight leading, treated as part of the design. Body: DM Sans. Data and numbers: a monospace (Space Mono or JetBrains Mono). Line length under 80 characters.
- **Avoid template tells:** repeated tracked-out eyebrow labels above every heading, numbered markers where the content is not a sequence (the four "How it works" steps are a real sequence, so numbers are fine there), identical rounded cards everywhere. Vary radius and elevation by hierarchy: sticker cards tilted -3 to 3 degrees, glass cards on dark, a podium that is clearly different from a form.
- **Color:** midnight `#0B0620`, indigo `#1B1450`, dusk purple `#3A2C78`, moon cream `#FFF8E7`, lavender `#D9D2FF`, Zzz yellow `#FFE14A`, pillow pink `#FF4F8B`, dawn orange `#FF9A3C`, heartbeat mint `#35F2B0`. Text on pink uses `#1A0B12`. Meet WCAG AA contrast everywhere.
- **Quality floor, built in without announcing it:** responsive from 320 px, visible keyboard focus, reduced motion respected, tap targets 44 px or more, safe-area insets, `100svh` not `100vh`.
- **Copy:** active voice, sentence case, buttons say exactly what happens, errors say what went wrong and how to fix it.
- **Critique as you build:** take screenshots (Playwright) and compare with the Stitch PNGs. Remove one accessory before you finish.

---

## 5. STACK AND ARCHITECTURE

**Scaffold.** Move the Stitch files as in Section 2, then scaffold in the project root:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If it refuses because the folder is not empty, scaffold into `./_scaffold`, move the contents up, delete `_scaffold`, and keep `design/`, `MASTER_PROMPT.md` untouched.

**Versions.** Check `npm view next version`. Use the latest stable Next.js (App Router), React 19, TypeScript strict, Tailwind CSS v4 (CSS-first `@theme`), Node 20+.

**Dependencies:**

- 3D: `three`, `@react-three/fiber` (v9 or newer, required for React 19), `@react-three/drei`, `@types/three`, `detect-gpu`; `@react-three/postprocessing` only for the high tier, lazy-loaded.
- Motion: `gsap` and `@gsap/react` (ScrollTrigger; GSAP is free for commercial use under its current licence, confirm on gsap.com before launch), `lenis`, `canvas-confetti` (lazy).
- State and forms: `zustand` (UI and tier only, never per-frame values), `zod`, `react-hook-form`, `@hookform/resolvers`.
- Backend: `prisma` and `@prisma/client` (SQLite by default; schema must work on PostgreSQL by changing `DATABASE_URL` and the provider; if Prisma setup fails after one retry, use Drizzle with better-sqlite3 and log it), `stripe` (env-gated), `resend` (env-gated), `jose` (admin session).
- Dev: `playwright`, `@axe-core/playwright`, `sharp`, `prettier`.

**Folder structure (create exactly this, adding files as needed):**

```
src/
  app/
    layout.tsx  page.tsx  globals.css  not-found.tsx  error.tsx
    opengraph-image.tsx  icon.tsx  sitemap.ts  robots.ts  manifest.ts
    (legal)/rules/page.tsx  (legal)/refund/page.tsx  (legal)/privacy/page.tsx
    ticket/[publicId]/page.tsx
    friends/page.tsx
    admin/page.tsx  admin/login/page.tsx
    api/register/route.ts  api/checkout/route.ts  api/stats/route.ts
    api/webhooks/stripe/route.ts  api/admin/export/route.ts
  components/
    layout/   Header  Ticker  Footer  SkipLink  MobileReserveBar  MobileMenu
    sections/ Hero  Counter  HowItWorks  Squad  Prizes  Gallery  Reserve  Faq  FinalCta
    ui/       StickerButton  GlassCard  Badge  Accordion  HeartbeatLine  Field  SlotRoll  Ticket
    motion/   SmoothScroll  ScrollBinder  SplitHeadline  Magnetic  CursorMoon  Preloader  SoundToggle
    three/    SceneRoot  SceneCanvas  rig/{CameraRig,SkyDome,SceneStates}  objects/{Moon,Pillow,Sleeper,ZzzLetters,Stars,Clouds,AirHorn,AlarmClock,Feather,Bacon,Steam,Podium,Coins,Sunrise}
              effects/Effects  fallback/StaticNight
    media/    FullBleedImage  HoverVideo
  content/    site.ts
  hooks/      useReducedMotion  useQualityTier  useInViewGate  useCountUp
  lib/        gsap.ts  scroll-state.ts  quality.ts  assets.ts  env.ts  db.ts  rate-limit.ts  validators.ts  ids.ts
              payments/{index,mock,stripe}.ts   email/{index,console,resend}.ts   auth.ts
prisma/       schema.prisma  seed.ts
public/       assets/{stitch,images,video,audio,lottie}  models/  draco/
scripts/      fetch-stitch-images.mjs  optimize-images.mjs  scan-assets.mjs
design/       stitch/  STITCH_MAP.md  DESIGN_PLAN.md
tests/e2e/    *.spec.ts
DECISIONS.md  BUILD_REPORT.md  README.md  .env.example
```

**Component rules:** Server Components by default. `'use client'` only for motion, three, forms and interactive UI. Never import `three`, `gsap` or `lenis` in a Server Component. Every section component takes no props except optional `className`; all copy comes from `content/site.ts`. Composition over boolean props. Typed props, `Readonly`.

---

## 6. DESIGN TOKENS, FONTS, TAILWIND

Map the Stitch `tailwind.config` into Tailwind v4 tokens in `globals.css`. Replace arbitrary hex values with theme classes. Starting point (reconcile with the Stitch config; Stitch wins for exact values of spacing and radius):

```css
@import "tailwindcss";

@theme {
  --color-midnight: #0B0620;
  --color-indigo: #1B1450;
  --color-dusk: #3A2C78;
  --color-cream: #FFF8E7;
  --color-lavender: #D9D2FF;
  --color-zzz: #FFE14A;
  --color-pillow: #FF4F8B;
  --color-dawn: #FF9A3C;
  --color-mint: #35F2B0;
  --color-ink: #1A0B12;
  --font-display: var(--font-titan), "Impact", system-ui, sans-serif;
  --font-body: var(--font-dm-sans), system-ui, sans-serif;
  --font-mono: var(--font-space-mono), ui-monospace, monospace;
  --radius-card: 28px;
  --radius-pill: 999px;
  --shadow-sticker: 6px 6px 0 var(--color-zzz);
  --shadow-sticker-pink: 10px 10px 0 var(--color-pillow);
}
```

Load fonts with `next/font/google` (`display: "swap"`, CSS variables on `<html>`): Titan One (or closest chunky rounded display), DM Sans (400, 500, 700), Space Mono. Utilities (`@utility` or component classes): `sticker-btn` (pill, 3px ink border, hard offset shadow, press = translate 3px and shadow shrinks), `glass` (indigo translucent, 1px dusk border, backdrop blur on high tier only), `tilt-l`, `tilt-r`. CSS custom properties `--sky-top`, `--sky-mid`, `--sky-bottom` on `:root` drive both the 3D sky and the no-WebGL fallback gradient.

---

## 7. PAGE SPECIFICATION (each section is a full-screen view)

Every section wrapper is `<section id="..." className="min-h-svh">`, content max width 1180 px, transparent background so the fixed scene shows through, except panels that must be opaque (squad backdrop, form card, FAQ). Use `svh`/`dvh`, never `vh`. Landmarks: `<header>`, `<main>`, `<footer>`, one `<h1>`, ordered `<h2>`s.

**Global chrome**
- **Ticker:** CSS marquee, duplicated track, `aria-hidden` on the duplicate, paused on hover and for reduced motion (static single line).
- **Header:** floating pill nav (How it works, Wake-up squad, Prizes, Reserve for $10). Hides on scroll down, shows on scroll up. Mobile: menu button opens a full-screen menu (focus trap, Escape closes, `inert` on the page behind). Sound toggle with `aria-pressed`.
- **MobileReserveBar:** sticky bottom bar with the pink Reserve button on mobile, hidden while `#reserve` is in view, respects safe-area inset.
- **Preloader (A1):** full-screen indigo overlay, a moon rises, a sheep counter runs 0 to 100 tied to real progress (fonts ready, hero poster decoded, 3D chunk and present assets loaded via drei `useProgress`). Minimum 1.2 s, hard maximum 4 s. Skipped on repeat visits in the same session and for reduced motion. It must not block LCP: the server-rendered hero is underneath.

**S1 Hero (`#hero`)**
- DOM: H1 "Can you sleep through anything?" huge in display type; sub-line; primary sticker CTA; price line; tilted yellow sticker badge "WIN $100,000" floating.
- Full-screen image: the hero poster (`FullBleedImage`, `priority`) is the LCP element and the no-WebGL fallback.
- 3D: sleeper on a mat with a giant pillow (center-right), smiling moon in a sleep cap (top right, follows the pointer with damping), inflatable yellow Zzz letters rising and fading in a loop, twinkling stars, drifting clouds. Pillow "breathes" (scale 1 to 1.03, 4 s). Camera pushes in as you scroll.
- Single orchestrated moment: headline words rise in sequence as the preloader exits (A2). Nothing else on the page auto-plays at load.

**S2 Counter (`#counter`)**
- Server-render the real count from the DB (revalidate 30 s), then hydrate with a client refresh every 60 s. Big monospace number "{count} / 200,000" in yellow, count-up on enter (A6), label and note from copy.
- **HeartbeatLine:** an SVG path. The filled portion (registered / 200,000) is a flat mint line, the unfilled portion is a spiky ECG line in lavender; a small moon marker sits at the boundary. Draw-on with stroke-dasharray (no paid plugins). Add `role="progressbar"` with `aria-valuenow`, `aria-valuemax`.
- Buttons: "Reserve my spot · $10" and "Bring a friend" (Web Share API, fallback copy-to-clipboard with a toast).
- Count rule: show only the real DB count. In development only, `NEXT_PUBLIC_DEMO_MODE=true` shows a clearly labelled "DEMO DATA" tag with a seeded number. Never fake counts in production.
- 3D: sleeper and pillow slide left and scale to 0.8.

**S3 How it works (`#how`)**
- Desktop: pinned stage (ScrollTrigger pin + scrub timeline), four steps move in on a horizontal rail, each with its illustration and the camera dolly across four beats (A7). Mobile (and reduced motion): plain vertical stack, no pin.
- Cards: numbered 1 to 4 (a real sequence), illustration slot from the asset manifest (phone registering, funny pajamas, rows of sleepers under a leaderboard, judge with feather), procedural icon fallback.

**S4 Wake-up squad (`#squad`)**
- Opaque dawn-orange to yellow backdrop panel (full-bleed), three sticker cards tilted differently: noise (air horn, alarm clock, rooster), tickle (feather), smell (bacon, coffee). Each card has a mini heartbeat strip labelled "Sleeper's heart rate".
- When 60% in view, run the rounds once (A8): the sky flashes dawn orange, a 300 ms screen shake on the section wrapper, each strip spikes then settles flat. A "Run the rounds again" button replays it. Hover or tap on a card animates only that card's object (horn shakes with rings, feather tickles, steam rises). Optional sounds only if enabled.
- Mobile: horizontal scroll-snap carousel with visible peeking edge.

**S5 Prizes (`#prizes`)**
- Podium is **DOM with CSS 3D perspective** (crisp, accessible text), five steps: 1st tall center (gold, trophy, "GRAND PRIZE" ribbon), 2nd left (silver), 3rd right (bronze), 4th and 5th smaller steps. Real `<ol>` semantics with visually arranged steps.
- Scene behind it provides spotlight beams, floating coins (instanced) and one-time confetti.
- Grand prize number does a slot-machine roll from 0 to $100,000 when 50% in view (A9). Reduced motion: shows the final value.
- Beside it, the "The price" card with the exact copy from Section 1.

**S6 Gallery (`#gallery`)**
- Heading: "What it will look like" (honest, pre-event). Bento grid of six tiles with `FullBleedImage`; two tiles use `HoverVideo` (muted, loop, playsinline, `preload="none"`, loads on intersect, plays on hover on desktop and on tap on touch, poster required). A small "Concept art" caption on any AI-generated tile. Optional `<dialog>` lightbox with focus management.

**S7 Reserve (`#reserve`)**
- Cream card with thick ink border and pink offset shadow on a pre-dawn sky. Fields: full name, email, mobile, date of birth, city and state, consent checkbox, button "Pay $10 and I'm in", refund note, small secure-payment line.
- Validation with zod on client and server: name 2 to 80 chars, valid email, mobile with digits (7 to 15), DOB must make the person 18 or older today, city/state non-empty, consent must be true. Honeypot field. Inline errors tied with `aria-describedby`, a polite `aria-live` summary, focus moves to the first invalid field.
- States: idle, submitting (button disabled with progress), error, success. `autocomplete` attributes, `inputmode`, correct `type`s. Capture `?ref=CODE` into the form.
- Flow: POST `/api/register` creates a pending registration, then `/api/checkout` (mock provider completes instantly and redirects to the ticket; Stripe redirects to Checkout, webhook marks paid). Idempotent on double submit.

**S8 FAQ (`#faq`)**
- Accessible accordion (button with `aria-expanded` and `aria-controls`, or native details), keyboard operable, smooth height via the CSS grid-rows technique, plus icon rotates. Four questions from Section 1.

**S9 Final CTA and footer (`#cta`)**
- Dawn: a sunrise rises behind a big alarm clock that rings (shake) once on entry (A15), button pulses gently after it. Headline "Think you can out-sleep America?" Then the footer.

**Extra pages**
- `/ticket/[publicId]`: boarding-pass ticket "You're in! Mat #12,345" (display number plus an unguessable `publicId` in the URL, never sequential ids), the registrant's first name, a mint heartbeat line, "Share with friends". The ticket flips in once with confetti (A13). No "Add to calendar" until a date exists: show "We will email you the date" and note the decision.
- `/friends`: the visitor's referral link (`/?ref=CODE`), copy and share buttons, and a "Top recruiters" list showing mat numbers and counts only (no names, for privacy).
- `/rules`, `/refund`, `/privacy`: readable layout with sticky table of contents. Content is a **DRAFT** that restates only Section 1 facts, with a visible banner "Draft: needs review by the client's promotions lawyer" outside production, and the same note in `BUILD_REPORT.md`. Do not claim legal compliance. Do not implement a free-entry route; list it under "Client and legal decisions" in the report.
- `/admin`: password gate (env `ADMIN_PASSWORD`, signed httpOnly cookie via `jose`), registrations table (search, pagination), totals, referral counts, CSV export. No PII in logs.

---

## 8. THE 3D AND SCROLL ENGINE

### 8.1 Architecture

One persistent, fixed, full-screen `<Canvas>` behind the DOM (`position: fixed; inset: 0; z-index: 0; pointer-events: none`). DOM content sits above (`z-10`). The canvas is loaded after first paint with `next/dynamic(..., { ssr: false })` triggered on idle. The 3D scene is a **state machine keyed by section id**; scrolling interpolates between states. No section creates its own WebGL context.

### 8.2 Scroll plumbing

- `lib/gsap.ts` registers ScrollTrigger once.
- `SmoothScroll` (client): Lenis with `autoRaf: false`; `gsap.ticker.add((t) => lenis.raf(t * 1000))`; `gsap.ticker.lagSmoothing(0)`; `lenis.on("scroll", ScrollTrigger.update)`; no `scrollerProxy` needed (Lenis moves the native window). Disabled for reduced motion. Anchor links call `lenis.scrollTo`. Full cleanup on unmount.
- `lib/scroll-state.ts`: a plain mutable module object `{ progress, velocity, section: { id, t }, pointer: { x, y }, tier }`. Written by `ScrollBinder` (one global ScrollTrigger plus one per section), **read inside `useFrame`**. Do not put per-frame values in React state.
- Use `useGSAP` from `@gsap/react` for every animation so cleanup is automatic. Kill triggers on route change. Use `ScrollTrigger.matchMedia` for desktop and mobile pin distances. Pin only on desktop. Call `ScrollTrigger.refresh()` after fonts and images settle.

### 8.3 Scene states (starting values, tune by eye against the Stitch PNGs)

| Section | Camera position | Look at | Sky (bottom to top) | Scene beat |
|---|---|---|---|---|
| hero | [0.8, 0.5, 7.5] | [0.4, 0.2, 0] | #FF9A3C, #FF4F8B, #3A2C78 | Dusk. Moon top right, sleeper center right, Zzz rising |
| counter | [0.2, 0.4, 6.4] | [0, 0, 0] | #FF4F8B to #1B1450 | Sleeper slides left, scale 0.8 |
| how | x from -2.5 to 2.5, y 0.5, z 6 | follows x | #3A2C78 to #0B0620 | Stars at full count, dolly across four beats |
| squad | [0, 0.2, 5] | [0, 0, 0] | #1B1450 to #0B0620, flash #FF9A3C | Props appear around sleeper, flash on each round |
| prizes | [0, 1.0, 8.5] | [0, 0.5, 0] | #0B0620 to #1B1450 | Spotlights, coins, confetti once |
| gallery | slow drift around [0.3, 0.3, 7.5] | [0, 0, 0] | #0B0620 | Dimmed, subtle parallax only |
| reserve | [0, 0.4, 6.5] | [0, 0, 0] | #3A2C78 to #FF9A3C | Pre-dawn, small alarm clock in a corner |
| cta | [0, 0.8, 6.8] | [0, 0.4, 0] | #FFE14A to #FF4F8B | Dawn, sun rising, alarm ringing |

Interpolate with `MathUtils.damp` (never snap). The sky also writes `--sky-top/mid/bottom` CSS variables so non-WebGL tiers share the same colors.

### 8.4 Objects: procedural first, GLB override

Every object must work with **zero external model files** so the build runs out of the box, then upgrade automatically when a GLB exists (Section 10).

- **SkyDome:** large inside-out sphere or far plane with a gradient shader (three color uniforms), `depthWrite: false`.
- **Stars:** one `Points` object, per-star phase attribute, twinkle in the shader, counts per tier.
- **Moon:** sphere with soft glow sprite, a striped sleep cap (cone, procedural canvas texture), closed-eye arcs and a smile built from partial torus geometry. Follows the pointer with damping.
- **Pillow:** `RoundedBox` with puffy vertex displacement, `MeshPhysicalMaterial` (sheen, roughness about 0.6). Breathing loop.
- **Sleeper:** stylized figure (capsule body, sphere head, striped pajamas via procedural canvas texture, closed eyes, tiny smile, blanket) on a mat. Charming and simple; GLB override `sleeper.glb`.
- **ZzzLetters:** three `ExtrudeGeometry` Z shapes with bevel, glossy yellow `MeshPhysicalMaterial` with clearcoat, rising along a curve and fading.
- **Squad props:** air horn (`LatheGeometry` plus cone), alarm clock (cylinder, torus, bells, hands), feather (curved plane with procedural alpha map), bacon (wavy extruded strip with stripe texture) with billboard steam sprites.
- **Coins and confetti:** instanced meshes, counts per tier. **Sunrise:** radial gradient disc rising, sun glow sprite.
- Materials and geometries are created once with `useMemo` and disposed on unmount. No `new THREE.Vector3()` inside `useFrame`; allocate outside and reuse.

### 8.5 Quality tiers and fallbacks

`lib/quality.ts` decides the tier: `none`, `low`, `med`, `high`, using WebGL2 support, `detect-gpu`, `hardwareConcurrency`, `deviceMemory`, `navigator.connection.saveData`, viewport width, and `prefers-reduced-motion`. Mobile caps at `med`. Unknown defaults to `med`.

| Setting | high | med | low | none |
|---|---|---|---|---|
| DPR max | 1.75 | 1.5 | 1.0 | n/a |
| Stars | 1500 | 700 | 250 | n/a |
| Clouds | 6 | 3 | 0 | n/a |
| Coins | 60 | 30 | 0 | n/a |
| Postprocessing | subtle bloom and vignette | off | off | n/a |
| Frame cap | none | none | 30 fps | n/a |
| Output | WebGL scene | WebGL scene | WebGL scene | `StaticNight` (layered PNG and CSS gradient with scroll parallax by transform) |

- Wrap the scene in drei `PerformanceMonitor` with `AdaptiveDpr`: on decline step DPR down, then tier down. One-way only, to avoid flip-flopping.
- Visibility gate: `frameloop="never"` when the tab is hidden or the canvas is not needed; resume on return.
- Handle `webglcontextlost`: switch to `StaticNight`.
- `<Canvas>` settings: `dpr` from tier, `gl={{ antialias: tier !== "low", powerPreference: "high-performance", alpha: true, stencil: false }}`, camera fov 40, ACES tone mapping.
- Budgets: the 3D chunk loads after first paint; total models about 5 MB or less; target under 100 draw calls on mobile.

### 8.6 Interaction

- Pointer parallax on the scene (damped, small), custom moon cursor and magnetic buttons only for `(pointer: fine)` and never in reduced motion. Never hide the native cursor over links, buttons or inputs.
- **Full-screen images:** `FullBleedImage` fills its section with `next/image` (`fill`, `sizes="100vw"`, AVIF or WebP, blur placeholder), gradient scrims for text contrast, and a subtle scrubbed parallax (±6%, transform only). Use it for the hero poster (`priority`), the squad backdrop, gallery tiles and the final CTA backdrop.
- **Audio** is optional and off by default (header toggle). Files load only after enabling; silent if missing. Sounds: lullaby loop, air-horn hit, success ding.

---

## 9. ANIMATION INVENTORY

Easing defaults: entrances `power3.out`, big reveals `expo.out`, stickers may use `elastic.out(1, 0.6)` sparingly, scrub 0.6 to 1.

| ID | Trigger | Animation | Reduced motion |
|---|---|---|---|
| A1 | Load | Preloader moon rise, sheep counter, wipe out | Skipped |
| A2 | Preloader exit | Hero headline words rise in sequence (manual word split, no plugin) | Final state |
| A3 | Always (hero visible) | Pillow breathing, Zzz loop, star twinkle, cloud drift | Static |
| A4 | Pointer | Scene parallax, moon follows | Off |
| A5 | Always | Ticker marquee | Static line |
| A6 | Enter view | Counter count-up, heartbeat line draws | Final state |
| A7 | Scroll (desktop) | How-it-works pinned rail and camera dolly | Vertical stack |
| A8 | 60% in view | Squad rounds: sky flash, shake, heartbeat spikes then flat | Static strips |
| A9 | 50% in view | Podium rise, grand prize slot roll | Final value |
| A10 | With A9 | Coins and confetti once | Off |
| A11 | Hover or tap | Gallery tile video plays | Poster only |
| A12 | Submit | Button progress, error shake (small), success flip | Instant state |
| A13 | Ticket load | Ticket flip-in and confetti once | Static |
| A14 | Click | FAQ accordion height and icon | Instant |
| A15 | Enter view | Sunrise rises, alarm clock rings once, CTA pulses | Static |
| A16 | Scroll direction | Header hide and show | Always visible |
| A17 | Press | Sticker button presses into its shadow | Same (not motion-heavy) |
| A18 | Scroll | Sky color and camera interpolation between states | Instant per section via IntersectionObserver |

---

## 10. ASSETS: MANIFEST, LOADERS, GENERATION LIST

**Principle:** the site builds and looks complete with **no generated assets** (procedural 3D, CSS and the downloaded Stitch images), then upgrades automatically as real assets are dropped into `public/`.

**Mechanism.** `scripts/scan-assets.mjs` scans `public/assets` and `public/models` and writes `src/lib/assets.generated.json` (key to path and exists flag). It runs on `predev` and `prebuild`. `lib/assets.ts` exposes `asset("hero.poster")` returning `{ src, exists }`. Components and 3D objects check `exists` and otherwise render the fallback. No 404s may appear in the console. Rasters use `next/image`; videos always have a poster; every informative image has real alt text, decorative ones use `alt=""`.

**STYLE LOCK for every 3D-style image prompt** (include in `README.md` and the table below): glossy toy-like 3D render, soft clay and inflatable look, rounded forms, pink and yellow rim light against deep indigo night, shallow depth of field, no text, no logos. All text is rendered in code, never baked into images.

| Key | Path | Spec | Generation prompt (subject) |
|---|---|---|---|
| hero.poster | `/assets/images/hero-poster.webp` | 2400x1350 | Cheerful adult in striped pajamas asleep on a fluffy mat with a giant pillow, smiling crescent moon in a sleep cap, giant glossy yellow Zzz letters, dusk sky with stars |
| layers.* | `/assets/images/layers/{sleeper,moon,zzz,stars,clouds}.png` | transparent PNG | One subject per file, same style, for the no-WebGL parallax |
| how.1 to 4 | `/assets/images/how-{1-register,2-pajamas,3-leaderboard,4-feather}.webp` | 1280x800 | Phone registering; contestants in funny pajamas; rows of sleepers under a glowing leaderboard; judge with a feather over a sleeper |
| squad.* | `/assets/images/squad-{noise,tickle,smell}.png` | 1000x1000 transparent | Air horn with sound rings, alarm clock and rooster; long feather; bacon strips with steam and coffee cup |
| squad.backdrop | `/assets/images/squad-backdrop.webp` | 2400x1200 | Dawn-orange to yellow gradient with soft rays |
| prize.* | `/assets/images/{trophy-gold,trophy-silver,trophy-bronze,cash-bag}.png` | transparent | Glossy trophies and a bag of cash with dollar signs |
| gallery.1 to 6 | `/assets/images/gallery-{1..6}.webp` | 1600x1200 | Warm cinematic night photography concept art: crowd in pajamas on mats in an arena; judge with feather; winner with giant check; leaderboard on giant screen; best-pajamas line-up; judges whispering through a megaphone (label as concept art) |
| cta.* | `/assets/images/cta-backdrop.webp`, `alarm-clock.png` | 2400x1350, transparent | Sunrise gradient sky; big twin-bell alarm clock |
| video.* | `/assets/video/{hero-loop,squad-teaser,gallery-1,gallery-2}.{mp4,webm}` | 720p, each 2 MB or less, muted loops | Hero loop 6 to 8 s seamless; squad teaser 15 s; two gallery loops |
| models.* | `/models/{sleeper,pillow,moon,zzz,air-horn,alarm-clock,feather,bacon,trophy,podium}.glb` | 1 MB or less each, total about 5 MB | Generate in an image-to-3D tool or sculpt in Spline or Blender; export GLB; compress with `npx gltfjsx model.glb --transform` or gltf-transform (Draco or Meshopt, WebP textures) |
| audio.* | `/assets/audio/{lullaby,airhorn,ding}.mp3` | short, looped lullaby | Soft music-box lullaby loop, air horn hit, success ding |
| brand | `/public/{favicon.ico,icon.png,apple-touch-icon.png}`, OG image from `opengraph-image.tsx` | | Moon in a sleep cap mark |

Also write `ASSETS_TO_GENERATE.md` listing every missing key with its prompt, so the client team can generate them later.

---

## 11. BACKEND: REGISTRATION, PAYMENTS, EMAIL, ADMIN

**Data model (Prisma, string statuses so it works on SQLite and PostgreSQL):**

```prisma
model Registration {
  id              Int       @id @default(autoincrement())
  publicId        String    @unique            // unguessable id for ticket URLs
  fullName        String
  email           String
  mobile          String
  dateOfBirth     DateTime
  cityState       String
  status          String    @default("pending") // pending | paid | refunded
  matNumber       Int?      @unique             // assigned when paid
  refCode         String    @unique
  referredBy      String?
  paymentProvider String    @default("mock")
  paymentRef      String?
  consentAt       DateTime
  createdAt       DateTime  @default(now())
  paidAt          DateTime?
  @@index([email])
  @@index([status])
}
model WebhookEvent { id String @id  createdAt DateTime @default(now()) }
```

Assign `matNumber` only when status becomes `paid`, inside a transaction (max + 1, retry on unique conflict).

**Endpoints**
- `POST /api/register`: zod validation, 18+ check from DOB, honeypot, rate limit (in-memory token bucket per IP, note in the code that production should use Redis), consent required. If a paid registration with the same email exists return 409 with a friendly message; if a pending one exists, reuse it (idempotent). Generates `publicId` and `refCode`; stores `referredBy` if the `ref` code is valid.
- `POST /api/checkout`: input `{ publicId }`; `payments` provider interface `createCheckout({ amountCents: 1000, ... })`. **Mock** provider marks paid immediately and returns `/ticket/{publicId}`. **Stripe** provider (when `STRIPE_SECRET_KEY` is set) creates a Checkout Session with `success_url` `/ticket/{publicId}?paid=1` and `cancel_url` `/?canceled=1#reserve`.
- `POST /api/webhooks/stripe`: read the raw body with `await req.text()`, verify the signature, handle `checkout.session.completed`, mark paid, assign mat number, send email, idempotent through `WebhookEvent`.
- `GET /api/stats`: `{ count, goal: 200000 }` counting `status = paid`, cached 30 s.
- `GET /api/admin/export`: CSV, admin only.

**Email:** provider interface with `console` (default) and `resend` (when `RESEND_API_KEY` is set). Confirmation email (HTML and text) with the ticket link and the refund note. No PII in logs.

**Admin auth:** `ADMIN_PASSWORD` env, constant-time compare, signed httpOnly secure cookie with `jose`, 8-hour expiry.

**Security:** zod on every input, Prisma only (no raw SQL), rate limits, security headers in `next.config` (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection, and a pragmatic CSP that allows `worker-src blob:` and wasm for three, delivered report-only first), secure cookies in production, collect only the PII in the schema, never log it, no secrets in the client bundle.

**Seed:** `prisma/seed.ts` creates demo registrations only when `SEED_DEMO=true` and never when `NODE_ENV=production`.

Out of scope but documented in the README: the second payment of $29.99 after the date is announced, refund processing, SMS.

---

## 12. ACCESSIBILITY, SEO, PERFORMANCE BUDGETS

**Accessibility (WCAG 2.2 AA target):** skip link; visible focus ring (3 px yellow, 2 px offset) on every interactive element; correct heading order; form labels, error text and `aria-live`; the canvas is `aria-hidden`; no content available only on hover; 44 px tap targets; contrast AA including text over images (scrims); `lang="en"`; `prefers-reduced-motion` and `saveData` honored; marquee and videos pausable; menu and dialogs trap focus and restore it. `@axe-core/playwright` must report zero serious or critical issues on every page.

**SEO and sharing:** metadata API with title template, description, canonical `https://sleepcontestusa.com`, Open Graph and Twitter cards; `opengraph-image.tsx` (with `next/og`, brand fonts embedded) and a square share card; `sitemap.ts`, `robots.ts`, `manifest.ts`, icons; JSON-LD `WebSite` and `Organization` (Sparsha LLC). Do not add `Event` schema until a real date exists.

**Performance budgets (mid-range Android over 4G emulation):** LCP under 2.5 s where the LCP element is the hero poster or H1, never the canvas; CLS under 0.1; INP under 200 ms; initial JavaScript before the 3D chunk about 200 KB gzip or less; the 3D chunk loads after first paint; desktop high tier holds 60 fps and mid mobile holds 30 fps or better; fonts `display: swap` and subset; responsive images; lazy videos. Run Lighthouse (mobile) and a bundle analysis, record the numbers in `BUILD_REPORT.md`, and fix regressions.

---

## 13. EXECUTION PHASES (autopilot, in this order)

After each phase run: `npm run lint`, `npx tsc --noEmit`, `npm run build`. Fix failures before continuing. Commit.

- **P0 Recon and plan:** Section 2 discovery, Section 3 skills, write `DESIGN_PLAN.md` (named palette, type roles, layout concept with ASCII wireframes, principles), review it against the brief and revise anything generic, write `STITCH_MAP.md` and the first lines of `DECISIONS.md`.
- **P1 Scaffold and tokens:** Section 5 scaffold, dependencies, Section 6 tokens, fonts, root layout, skeleton pages. Build green.
- **P2 Static pixel pass:** every section and extra page from the Stitch export with real copy from `site.ts`, responsive from 320 to 1920 px, no animation yet. Screenshot at 1440, 820 and 390 and compare to the Stitch PNGs; fix deviations.
- **P3 Asset pipeline:** fetch and optimize Stitch images, `scan-assets.mjs`, `assets.ts`, `FullBleedImage`, `HoverVideo`, procedural and CSS fallbacks, `ASSETS_TO_GENERATE.md`.
- **P4 Motion foundation:** `SmoothScroll`, `ScrollBinder`, scroll-state, Preloader, A1, A2, A5, A6, A14, A16, A17, reduced-motion handling.
- **P5 3D scene:** `SceneRoot`, scene states, sky, stars, moon, pillow, sleeper, Zzz, camera rig, quality tiers, `StaticNight` fallback, visibility gate. Then squad props, podium extras, sunrise, alarm clock. Wire A3, A4, A7 to A10, A15, A18.
- **P6 Backend and flows:** Prisma, endpoints, mock and Stripe providers, email, ticket page, friends page, admin, stats, seed.
- **P7 Content pages and SEO:** legal drafts, 404 and error pages, metadata, OG image, sitemap, robots, manifest, icons.
- **P8 Hardening:** axe, the **web-design-guidelines audit** over `src/**/*.tsx`, a **vercel-react-best-practices** pass, Lighthouse and bundle analysis, Chromium, WebKit and Firefox smoke tests, mobile emulation, WebGL-disabled test. Fix every finding.
- **P9 Docs and report:** `README.md`, `.env.example`, `BUILD_REPORT.md`, final commit.

---

## 14. TESTING AND VERIFICATION

Write Playwright tests in `tests/e2e/` covering: home loads with no console errors; no horizontal overflow at 320, 390, 820, 1440 px; nav anchors scroll to sections; reserve form shows validation errors (empty fields, under-18 DOB, missing consent); a valid mock registration ends on the ticket page; duplicate paid email shows the friendly error; counter equals the DB count; reduced-motion emulation removes the marquee, pinning and parallax; keyboard-only completion of the form and FAQ; axe has zero serious or critical issues on every page; `/api/stats` shape; `/admin` is gated; with WebGL disabled the page renders `StaticNight` and stays usable.

**Visual QA loop:** for each section take screenshots at 1440x900, 820x1180 and 390x844, compare against the Stitch PNGs, and fix spacing, type and composition deviations. Also check the 3D at three scroll positions per section. Keep the best screenshots in `tests/screenshots/`.

---

## 15. ENV AND SCRIPTS

`.env.example`:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CONTEST_DEADLINE=
NEXT_PUBLIC_SPONSOR=
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_DEMO_MODE=false
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=change-me
SESSION_SECRET=change-me-long-random
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
SEED_DEMO=false
```

`package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test:e2e`, `assets:scan`, `assets:optimize`, `db:push`, `db:seed`. `predev` and `prebuild` run `assets:scan`.

---

## 16. DO AND DO NOT

**Do:** keep one persistent canvas; drive 3D from a mutable scroll-state object; use `useGSAP`; lazy-load 3D, confetti and video; ship fallbacks for every tier; keep copy in `site.ts`; commit per phase; log decisions.

**Do not:** create more than one WebGL context; put per-frame values in React state; import `three` or `gsap` in Server Components; hotlink remote images; add generic particle backgrounds or effects that do not serve the dusk-to-dawn idea; autoplay sound; hijack scroll beyond Lenis smoothing; use `100vh`; hide the native cursor over interactive elements; write fake counts, testimonials, sponsors or legal claims; leave literal `[PLACEHOLDER]` text on the live site; commit secrets or `.env`.

---

## 17. DEFINITION OF DONE

All must be true:

- [ ] `npm install && npm run dev` works with no credentials; the full flow (register, mock pay, ticket) works end to end.
- [ ] Lint, typecheck, build and all Playwright tests pass; axe shows zero serious or critical issues.
- [ ] Every section matches the Stitch PNG composition at 1440, 820 and 390 px, and has the 3D beat and animations from Sections 7 to 9.
- [ ] The tiers work: WebGL scene on high, med and low; `StaticNight` with WebGL disabled or reduced motion.
- [ ] Reduced motion produces a calm, complete experience with no pinning, marquee, parallax or confetti.
- [ ] Lighthouse mobile numbers recorded; budgets met or deviations explained.
- [ ] No console errors or 404s; no hotlinked images; no literal placeholders shown in production mode.
- [ ] `README.md`, `.env.example`, `DECISIONS.md`, `ASSETS_TO_GENERATE.md` and `BUILD_REPORT.md` exist and are accurate.

---

## 18. FINAL REPORT (`BUILD_REPORT.md`)

Include: a three-line summary; how to run (install, env, `npm run dev`); what was built per section and page; decisions made; measured Lighthouse, bundle sizes and fps notes; known gaps; and these sections.

**Needs client input:** confirm 4th prize amount (message said $5, built as $5,000); sponsor name; deadline date; contact email; Stripe keys and Resend key; real photos and videos to replace concept art; generated assets from `ASSETS_TO_GENERATE.md`.

**Client and legal decisions:** a paid entry, cash prizes and a result driven by heart rate may be treated as a lottery in some US states; the client should have a promotions lawyer review the structure and the draft rules, waiver and privacy pages, and decide on a free alternative entry route. This report is not legal advice.

**Deployment notes (DigitalOcean Ubuntu):** Node 20+, `npm run build` then `next start` behind Nginx with HTTPS, process manager (PM2 or systemd), PostgreSQL via `DATABASE_URL` for production, set all env vars, run `prisma migrate deploy`, enable gzip or brotli, long-cache `/_next/static` and `/assets`.

**Next steps:** the second payment ($29.99), refunds flow, SMS reminders, a real heart-rate leaderboard for event day, replace concept art with event photography.
