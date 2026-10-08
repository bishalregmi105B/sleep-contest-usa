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