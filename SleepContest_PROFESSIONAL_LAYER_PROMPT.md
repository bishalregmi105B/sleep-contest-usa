# THE GREAT AMERICA'S SLEEP CONTEST: PROFESSIONAL LAYER (RESEARCH + ADDENDUM PROMPT)

> How to use: add this file to the repo root as `PROFESSIONAL_LAYER_PROMPT.md`, next to `REALISM_PROMPT.md`. Then tell your AI code editor:
> **"Read PROFESSIONAL_LAYER_PROMPT.md. Execute it in autopilot after REALISM_PROMPT.md is complete (or together with it). The same rules apply: branch, commit per phase, no questions, log decisions in DECISIONS.md."**
>
> `REALISM_PROMPT.md` changes how the site *looks*. This file changes how it *earns trust*: the research on comparable platforms, and the professional layer that makes a paid-entry contest feel legitimate, clear and premium.

---

## PART 1. RESEARCH: WHAT PROFESSIONAL PLATFORMS DO

**1. Wakefit Sleep Internship (India), the closest comparable.**
A dedicated microsite for a "get paid to sleep" campaign. It combined a hero video, sleep facts and tips, a simple form, winner profiles with interviews, a separate full Terms page (eligibility 18+, deadlines, how the winner is judged from tracker data, consent to use likeness) and an FAQ. Reported results: about 1.7 lakh applications from around 30 countries in 3 to 4 weeks, and the team had to answer thousands of comments and queries.
*Lessons:* a fun idea still needs serious paperwork; education content gives credibility; **plan for support volume**; keep a plain-language terms page one click away.

**2. Beast Games (US game show application site).**
Prize-forward and scarcity-led ("I need 5,000 people"), with a clear eligibility checklist up front and a personal one-minute video as the apply step. Qualifiers were filmed in a real stadium (Allegiant Stadium in Las Vegas).
*Lessons:* state who can enter before asking for anything; stadium-scale imagery has real precedent; one obvious action.

**3. Event sites (Tomorrowland, Chicago Marathon, SXSW, HubSpot INBOUND).**
Tomorrowland pairs an atmosphere-first hero with a hard-working ticket bar underneath, so mood and action coexist, though heavy media can slow first paint. The Chicago Marathon uses real runner photography and puts registration, course, spectator and results links one or two clicks away, and aligns its sponsor's brand with the event. Strong event pages put the name, dates, location, a one-sentence value proposition and a single primary CTA above the fold, plus one lightweight proof element. Countdowns, headline stats and clear registration options help.
*Lessons:* a **facts bar** under the hero; quick links for rules and FAQ; real people over illustration.

**4. Sleep and health-tech brands (Eight Sleep, WHOOP, Oura).**
Dark canvases, full-bleed lifestyle photography, hairline UI, tabular numerals, one accent color, data shown honestly. They look like instruments, not toys.
*Lessons:* already applied in `REALISM_PROMPT.md`.

**5. Paid competition operators and trust research.**
Competition operators that survive scrutiny publish clear rules and entry limits, secure payments, recorded winner selection and open communication. General trust research agrees: show your **legal identity**, put a plain-language **refund policy** next to the payment step, keep privacy, terms and contact details visible, and use **recognized payment-processor marks**. A homemade "Secure Payment" icon conveys nothing. Vague superlatives are weak trust signals.
*Lessons:* the rules page and the refund line are conversion features, not legal clutter.

**6. Pre-launch and waitlist pages.**
The best ones show a real counter if they have one and never invent numbers; fake or inflated numbers backfire when discovered. Many tools let you hide the counter until a minimum threshold. A referral prompt on the confirmation page and a post-signup email sequence keep people engaged.
*Lessons:* a visible "0 / 200,000" on day one hurts; hide the number below a threshold, keep the target and the story; use the confirmation page to recruit friends.

---

## PART 2. THE PROFESSIONAL STANDARD (what the client should feel)

1. **Clear in five seconds:** what it is, where, when, who can enter, what it costs, what to do next.
2. **Legitimate:** a named organizer, visible rules, a visible refund promise, a real contact.
3. **Honest:** real counts only, concept visuals labeled, scoring explained without exaggeration.
4. **Safe:** noise, smells, medical conditions and data are addressed before anyone asks.
5. **Cinematic but fast:** atmosphere above the fold, action one tap away, performance budgets met.
6. **Complete:** confirmation, email, ticket, referral, admin and analytics all work and look branded.
7. **Calm polish:** consistent spacing and type, no layout shift, graceful errors, every state designed.

---

## PART 3. THE PROFESSIONAL LAYER: WHAT TO BUILD

Rules for this layer: keep all copy in `src/content/site.ts`; anything marked **[CLIENT]** needs the client's decision, so build it behind a config flag, hide it in production until the value exists, and list it in `CLIENT_INPUTS_NEEDED.md`. Never publish invented facts.

### 3.1 Facts bar (under the hero)
A hairline bar directly under the hero, four cells plus a button, all values from `site.ts`:
**Where** Cities across the USA, starting with Dallas, Texas · **When** Date announced when 200,000 sleepers register · **Who** Adults 18 and over · **Entry** $10 reserves your spot, $39.99 total · [Reserve my spot · $10].
Sticky on desktop after the hero scrolls away (compact version). On mobile it becomes a two-by-two grid above the CTA.

### 3.2 Counter threshold (no embarrassing zero)
- Add `NEXT_PUBLIC_COUNTER_MIN_PUBLIC` (default `500`). If the real paid count is below it, **do not show the numeric count**. Show "Registration is open. We need 200,000 sleepers to make this happen." with the target "200,000" and the full ECG line. At or above the threshold, show the real number and progress.
- The admin view always shows the exact count. Never display a number that is not real.
- Replace the final CTA count line accordingly (below threshold: "We need 200,000 sleepers. Reserve your spot for $10 and pay the rest after the date is announced.").

### 3.3 Organizer identity and trust strip
- Footer identity block: **Sparsha LLC**, `[CLIENT]` postal address, contact email (`mailto:`), links to Official rules, Refund policy, Privacy, and Contact. Hide any unset line.
- Trust strip directly under the form button (small, calm): "Full refund if the date doesn't suit you or the contest doesn't go ahead." · "Official rules" link · "Privacy" link · payment line.
- **Payment line:** when Stripe is live show "Payments are processed by Stripe. We never see or store your card details." Use Stripe's official mark if the client wants a badge; do **not** draw a custom security icon. In mock mode show nothing about card security.

### 3.4 Rules in 60 seconds
A summary card next to the form (and linked from the facts bar), clearly labeled "Summary only. The official rules apply." Bullets, all from `site.ts`:
- **Who can enter:** adults 18 and over.
- **Cost:** $10 now to reserve, $29.99 after the date is announced, $39.99 total.
- **When:** after 200,000 sleepers register; registrants are emailed first.
- **How the winner is chosen:** the sleeper whose heart rate drops the most and stays steady through every wake-up round.
- **Refunds:** full refund if the date doesn't suit you or the contest doesn't go ahead.
- Link: "Read the official rules".
The `/rules` page gets a plain-language intro, a table of contents, and a "last updated" date.

### 3.5 Safety, access and data FAQ (drafted, hidden until approved) **[CLIENT]**
Add these questions to the FAQ data with `status: "draft"`. Render them only when `NEXT_PUBLIC_SAFETY_FAQ_APPROVED=true`. Provide neutral placeholder answers marked `[CLIENT: confirm]`:
- Is the noise safe for my hearing? (hearing protection policy, sound-level limits)
- Can I skip a round? (the smell round uses bacon and coffee: dietary, religious and allergy accommodations)
- What if I have a medical condition? (who should not enter, on-site medical support)
- Do I have to travel, and is anything provided? (travel, lodging, mats and pillows are provided)
- Will I be filmed? (consent and use of footage)
- What happens to my heart-rate data? (heart-rate data is health-related; state what is collected, how long it is kept, who sees it)
- What if I cannot fall asleep? (disqualification, refund of the remaining payment)
- Prizes: how and when are winners paid, and who handles taxes? (leave to the rules; **[CLIENT]**)

Also add a heart-rate and biometric data paragraph to the Privacy page draft, flagged for lawyer review.

### 3.6 "From reserve to wake-up call" timeline
Merge the "What happens next" list and the How it works steps into one clear horizontal timeline near the form: **Reserve $10** → **We reach 200,000** → **Date and venue announced, you pay $29.99** → **Show up in pajamas** → **Sleep for 90 minutes** → **Survive the squad**. Mono numerals, hairline connectors, honest dates ("Date announced at 200,000").

### 3.7 Confirmation, ticket and email
- Ticket page: add a "What happens next" mini-timeline, a share block (copy link, Web Share), and the friend link, since referral prompts on the confirmation page are a proven pattern. Keep "Add to calendar" hidden until a date exists.
- Confirmation email: branded HTML (table layout, inline styles, dark and light safe) plus a plain-text version. Contents: mat number, ticket link, three-step "what happens next", refund line, rules link, contact. Subject: "You're in. Your mat number is {matNumber}."
- Write `docs/EMAIL_PLAN.md` describing the follow-up sequence (not built): milestone updates at 10%, 25%, 50%, 75% and 100% of 200,000; "date announced" with the payment link; a reminder; a refund notice if the deadline passes. Mark all dates **[CLIENT]**.

### 3.8 Production readiness (important)
- **Mock payments must never look real in production.** If the provider is `mock` and `NODE_ENV=production`, show a slim persistent banner: "Preview: payments are simulated. No money is taken and no ticket is issued for real." Do not send real emails. Exclude mock registrations from the public counter.
- **Persistence:** the in-memory store does not persist across serverless instances on Vercel, so counts can reset or differ between requests. Before any real launch, set `DATABASE_URL` to a managed PostgreSQL database (for example Vercel's or Neon's), run `npm run db:push`, and verify the count survives redeploys. Document this at the top of `DEPLOY.md`.
- Add a `/api/health` route and a startup check that logs which providers are active (never secrets).

### 3.9 Analytics and the admin dashboard
- Add `@vercel/analytics` and `@vercel/speed-insights` (the site is on Vercel; cookie-free, no PII). Track events: `reserve_click`, `form_start`, `form_submit`, `registered`, `share_click`. Mention analytics in the Privacy draft.
- Admin: add a daily registrations chart (SVG sparkline and table), totals, referral leaders, and a simple funnel (views to clicks to submissions to paid, when data exists). CSV export stays.

### 3.10 Polish checklist (every item must pass)
- One spacing scale (4 or 8 px), one type scale, consistent section rhythm; `scroll-margin-top` so anchors clear the sticky header.
- Every state designed: loading, empty, error, success, offline, 404, 500. Branded 404 with a way back.
- Forms: inline validation after blur, input preserved on error, no layout shift, correct keyboard types, visible focus, accessible error summary.
- `<noscript>` message, `theme-color`, `color-scheme: dark`, correct `lang`, working `mailto:` and `tel:` links.
- Print stylesheet for the ticket; share image and favicon final.
- Copy pass: sentence case, active voice, buttons say what happens, no placeholder text or square brackets visible in production, spelling checked.
- Social links render only if configured (`NEXT_PUBLIC_INSTAGRAM`, `NEXT_PUBLIC_TIKTOK`, `NEXT_PUBLIC_X`).

### 3.11 Client pack
Generate three files so the client sees professionalism and knows what is theirs to supply:
- `CLIENT_INPUTS_NEEDED.md`: a checklist with owner and why it matters: legal entity address, contest deadline, sponsor, contact email, social links; **how heart rate is measured and verified**, who judges, how ties and disputes are handled; prize payout method, timing and taxes; safety and medical policy, hearing protection, accommodation for the smell round; data retention for biometric data; lawyer review of rules, waiver, privacy and the paid-entry structure; real photos and videos; Stripe and email credentials; managed database.
- `CLIENT_PRESENTATION.md`: a six-slide outline: before and after, what is real versus concept visuals, how the money flows, what happens at 200,000, risks and what we need from the client, next steps and timeline.
- `demo/after/` screenshots of every section at 1440 and 390 px, and the Lighthouse summary.

---

## PART 4. PHASES (continue the numbering from REALISM_PROMPT.md)

After each phase run `npm run lint`, `npx tsc --noEmit`, `npm run build`, then commit.

- **P1 Facts, counter, trust:** 3.1, 3.2, 3.3, 3.4.
- **P2 Safety and data:** 3.5 plus the Privacy and Rules page updates.
- **P3 Journey and confirmation:** 3.6, 3.7.
- **P4 Production readiness:** 3.8, health route, `DEPLOY.md`.
- **P5 Analytics and admin:** 3.9.
- **P6 Polish and client pack:** 3.10, 3.11, tests, axe, Lighthouse, screenshots.

**Tests to add:** below-threshold counter hides the number and shows the target; at-threshold shows the real number; the mock-payments banner appears when `NODE_ENV=production` and provider is mock; the facts bar values equal `site.ts`; no unset placeholder or square-bracket text on any production page; footer identity hides empty lines; draft FAQ items are hidden unless approved; analytics events carry no PII; axe is clean.

---

## PART 5. DEFINITION OF DONE

- [ ] Every item in Part 3 is implemented or explicitly deferred with a reason in `DECISIONS.md`.
- [ ] A first-time visitor can answer what, where, when, who, how much and what next within five seconds of landing, without scrolling.
- [ ] No fake or zero-looking social proof; the counter follows 3.2; mock payments are unmistakable in production.
- [ ] Rules, refund, privacy and contact are one click away from the form and the footer; the organizer is named.
- [ ] Safety, access and data answers exist as drafts and are hidden until the client approves them.
- [ ] Lint, typecheck, build, Playwright and axe pass; Lighthouse and the performance budgets from `REALISM_PROMPT.md` still hold.
- [ ] `CLIENT_INPUTS_NEEDED.md`, `CLIENT_PRESENTATION.md`, `docs/EMAIL_PLAN.md` and `demo/after/` exist.

*This document is not legal advice. A paid entry, cash prizes and a result driven by heart rate may be treated as a lottery in some US states. The client should have a promotions lawyer review the structure, official rules, waiver and privacy policy before launch, and decide whether a free alternative way to enter is needed.*
