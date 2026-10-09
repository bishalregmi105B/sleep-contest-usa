# Client presentation

Six slides. Each is a claim followed by the evidence for it, so the deck can be
argued from rather than read out.

Screenshots referenced below are in `demo/before/` and `demo/after/`, at 1440
and 390 px, every section.

---

## 1. Before and after

**Before** (`demo/before/1440-hero.jpg`): a sleeping infant in a striped
nightcap on an inflatable cloud, a smiling moon in a nightcap, glossy yellow
"Zzz" balloons, a pink sticker button with a hard offset shadow, a tilted prize
badge, and an entire wake-up-squad section painted a saturated orange-to-yellow
gradient. The image and the caption did not match: step 3, "Sleep for 90
minutes", showed a feather; step 4, "Survive the wake-up squad", showed a chef
with bacon. Three of the six gallery tiles were duplicates of the how-it-works
images.

**After** (`demo/after/1440-hero.jpg`): a title card over a night that runs from
dusk through midnight to sunrise, film grain and a vignette across the page, one
pink CTA, a hairline prize plaque, a faceless cratered moon. No characters, no
props, no mascots, no tilt, no emoji.

**What we removed rather than restyled:** the whole 3D toy world (the sleeping
figure, the moon's face and nightcap, the Zzz letters, the clouds, the horn, the
feather, the bacon, the alarm clock), the sticker and tilt utilities, and every
Stitch-derived image. Those are archived in `design/archive/`, not deleted, so
the change is reversible.

**What we kept:** the section structure and order, the dusk-to-dawn arc, the
heartbeat motif, every working flow, the content model, and the copy voice.

---

## 2. What is real and what is concept

This matters more than it sounds. The event has not happened.

**Real.** Every number on the site is read from a live database: the registration
count, the mat count, the referral count, the daily chart. Every price, the goal
and the age limit come from one content file, so the facts bar, the counter, the
rules page, the refund policy and the confirmation email cannot disagree with
each other. Every rule the site states about judging matches the official rules.

**Concept.** The site ships with **no photographs at all**. That is a decision,
not an omission: an empty image slot under the heading "concept visuals
generated to show what the night could look like" would be claiming images exist
when none do. So the gallery shows the night's schedule instead and says plainly
that photography follows the first event. When real or generated photographs land
in `public/assets/`, the gallery switches to its photo grid automatically with no
code change.

**Removed, deliberately.** The old footer said "Join 200,000 Americans already
registered" directly above a counter reading zero. That claim is gone. Below 500
paid registrations the site now says "Registration is open. We need 200,000
sleepers to make this happen" and shows the target rather than a number. The
number appears the moment it is real and is never inflated.

---

## 3. How the money flows

```
Visitor fills the form            $0
  → the site checks age, email, format
  → a pending registration is created, a mat number is reserved
  → /api/checkout hands off to Stripe (or, in the demo, completes instantly)
  → Stripe confirms by webhook
  → the registration becomes paid, the mat number is assigned
  → a confirmation email arrives with the ticket link and the refund promise
  → the counter moves
```

**$10 today. $29.99 only after the date is announced. $39.99 total.**

Three things protect the visitor:

- The **refund promise sits directly under the pay button**, not in a footer. A
  plain-language refund line next to the payment step is the highest-value line on
  a paid-entry page.
- **"The rules in 60 seconds"** sits next to the form, so nobody pays to find out
  who can enter or how the winner is chosen.
- The **whole journey is one timeline**, from $10 to waking up. The old site had
  two separate lists saying overlapping things, which is how a $39.99 payment ends
  up looking like three different amounts.

**Two honesty guards.** A production deployment still on the simulated payment
provider shows a banner on every page saying no money is taken and no ticket is
issued. And `/api/health` returns HTTP 503 with a list of exactly what is not yet
configured, so this cannot pass unnoticed.

---

## 4. What happens at 200,000

| At | What the visitor sees | What we send |
| --- | --- | --- |
| 1 registration | The target and the story. Never a zero. | Confirmation with mat number and ticket |
| 500 registrations | The real number appears, with progress | Milestone email (sequence drafted) |
| 25 / 50 / 75% | Real number and progress, no pressure | Milestone emails |
| 200,000 | The date is announced | Every registrant emailed **first**, with the payment link for the $29.99 |
| Deadline | — | If it is not reached, every reservation is refunded in full |

The counter is deliberately quiet. There is no countdown, no "last chance", no
daily progress email. Scarcity applied to a sleep contest is off-message, and the
date being announced once is not a sale.

**The one thing that matters here:** if 200,000 is not realistic, the honest move
is to change it now. `SITE.goal` is a single constant; changing it updates the
counter, the facts bar, the rules, the refund policy, the emails and the sitemap
together.

---

## 5. Risks, and what we need

**Risks we can manage.** Performance, accessibility, mobile, browser support,
deployment. Measured and automated, not asserted.

**Risks we cannot manage, and will not pretend to.** These are listed in full in
`CLIENT_INPUTS_NEEDED.md`; the four that block a public launch:

1. **No promotions lawyer has reviewed this.** A paid entry with cash prizes and a
   heart-rate result may be treated as a lottery in some US states. Every legal
   page carries a visible notice saying so.
2. **There is no waiver.** The form asks entrants to agree to "the rules, waiver
   and filming", but no waiver document exists. Write one or remove the words.
3. **No method for deciding the winner.** The site says the winner is decided by
   heart rate and does not say how. A contest decided by a measurement needs a
   published method and a route to challenge it.
4. **The safety answers are not written.** Hearing protection, the bacon-and-coffee
   round for allergies, who should not enter, and what happens to heart-rate data
   are drafted and **hidden**, not guessed.

**Two silent failures that are easy to miss and expensive to discover late.** The
demo runs in memory, which resets on every deploy — a live contest would quietly
lose registrations while looking perfectly normal. And the simulated payment
provider looks identical to a real one from the outside. Both are now impossible
to miss: `/api/health` reports them as degraded and returns 503.

---

## 6. Next steps

**This week — unblocks a launch**
1. Answer the **[BLOCKING]** items in `CLIENT_INPUTS_NEEDED.md`.
2. Book the promotions lawyer. Send `/rules`, `/refund`, `/privacy` and the
   paid-entry structure.
3. Provision PostgreSQL and Resend; set `NEXT_PUBLIC_SITE_URL`.
4. Confirm the 4th prize is $5,000 and that 200,000 is the right number.

**Before the site goes public**
5. Replace the legal notices with the reviewed versions, dated.
6. Turn on the safety FAQ once the wording is approved.
7. Wire Stripe and test a real $10 payment end to end.
8. Generate the photography, or accept the schedule-led gallery until the first
   event.

**What is already done and does not need revisiting**
- 64 automated acceptance checks pass, covering the counter threshold, production
  copy, the payment banner, accessibility, contrast, reduced motion, data saver,
  no-WebGL and layout stability.
- Clean on Chromium and Firefox, including a full registration to ticket.
- Real measured LCP 1.2 s, CLS 0.026, on a 4× CPU throttle at 390 px.
- 64 KB of committed webfonts; the build makes no network call.

**One honest caveat.** The desktop, mid and mobile layouts were verified by
screenshot, and the browser coverage is Chromium and Firefox. WebKit could not be
launched in the build environment (missing system libraries), so Safari and iOS
are **untested here** and should be checked on a real device before launch.