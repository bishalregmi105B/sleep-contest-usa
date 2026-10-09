# What we need from you

Everything below is something we cannot supply ourselves, either because it is a
fact about your organisation or because it is a legal decision. Nothing here
blocks the site being deployed and demonstrated today — the site is built so
that each missing answer is **hidden rather than faked**. Every line marked
**[BLOCKING]** must be answered before the contest is publicly announced.

---

## 1. Legal identity

| What | Owner | Why it matters |
| --- | --- | --- |
| **[BLOCKING]** Registered address of Sparsha LLC | You | Your rules and privacy pages must name a real legal entity with a postal address. Contest rules in the US normally require this. |
| Contact email for entrants | You | Currently falls back to a generic address. A contest taking money needs a monitored mailbox. |
| Contact phone **[BLOCKING]** | You | US contest rules commonly require a local number or a toll-free line for consumer enquiries. |
| **[BLOCKING]** Promotions lawyer | You | See section 6. |

Set the first three as `NEXT_PUBLIC_ORGANIZER_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL`
and `NEXT_PUBLIC_CONTACT_PHONE`. They appear in the footer and on every legal
page automatically. Nothing needs a code change.

---

## 2. How the contest is decided

This is the single most important gap. The winner is decided by heart rate, and
right now the site says so without saying how.

| What | Owner | Why it matters |
| --- | --- | --- |
| **[BLOCKING]** How is heart rate measured? | You | Chest strap, ear clip, wrist device, or something else? |
| **[BLOCKING]** How is a reading verified? | You | Does the device sync automatically, or does a judge confirm it? |
| **[BLOCKING]** How are ties broken? | You | Suggested: higher prize goes to the earlier registrant, tied entrant gets the next prize down. |
| **[BLOCKING]** Who adjudicates a dispute, and within what time? | You | An entrant who loses on a number needs a published route to challenge it. |
| **[BLOCKING]** Can entrants see their own reading afterwards? | You | |

A contest decided by a measurement needs a **published method**. "We looked at
the data" is not a method, and it is the first thing a losing entrant disputes.

---

## 3. Safety, access and health data

Eight questions are drafted and hidden. They go live the moment you set
`NEXT_PUBLIC_SAFETY_FAQ_APPROVED=true`. **We will not publish them before you
approve the wording.**

| Question | What we need |
| --- | --- |
| Is the noise safe for my hearing? | Hearing protection policy; the sound level of the noise round; whether ear defenders are issued. |
| Can I skip a round? | The smell round uses bacon and coffee. What is the alternative for dietary, religious and allergy reasons? |
| What if I have a medical condition? | Who should not enter; what on-site medical support exists; who staff should call. |
| Do I have to travel? | Whether travel and accommodation are provided, and who pays. |
| Will I be filmed? | How footage is used, how long it is kept, and whether entrants can opt out of publication. |
| What happens to my heart-rate data? **[BLOCKING]** | What is collected, how long it is kept, who can see it, whether the device stores its own copy, and whether an entrant can demand deletion. |
| What if I cannot fall asleep? | Whether that disqualifies, and whether the remaining balance is refunded. |
| How are prizes paid? | Method, timing, and who handles tax withholding. |

**On heart-rate data specifically:** it is health-related data. Saying "we don't
keep it" when you do is a much worse position than saying plainly what happens to
it. This needs the lawyer, not just an editor.

---

## 4. Money

| What | Owner | Why it matters |
| --- | --- | --- |
| **[BLOCKING]** Stripe account and keys | You | The site runs a simulated payment until these are set, and says so in a banner on every page. |
| **[BLOCKING]** Confirm the 4th prize is $5,000 | You | The original brief said "$5" for fourth place. $5,000 is currently an assumption, flagged in the code. |
| **[BLOCKING]** Deadline for reaching 200,000 | You | The refund policy says "by the deadline we announce" until this exists. |
| Payout timing and method for winners | You | |
| Who pays the prize money before it is won | You | |

---

## 5. Assets and identity

| What | Owner | Why it matters |
| --- | --- | --- |
| Photography and video from real events | You | The site ships with **no** photographs on purpose: an empty frame reads as broken, and inventing an image for a contest that has not happened would be dishonest. `ASSETS_TO_GENERATE.md` has the prompt and path for each one. |
| Sponsor name | You | Adds "Presented by …" to the prizes section. Set `NEXT_PUBLIC_SPONSOR`. |
| Social links | You | Rendered in the footer only if set: `NEXT_PUBLIC_INSTAGRAM`, `NEXT_PUBLIC_TIKTOK`, `NEXT_PUBLIC_X`. |

---

## 6. Legal review **[BLOCKING]**

**This document is not legal advice, and neither is the site's.**

A paid entry with cash prizes where the winner is decided by a physiological
measurement may be treated as a **lottery** in some US states. Whether that is so,
and whether a free alternative way to enter must be offered, depends on the
structure and the state — and it is not something to find out afterwards.

Send your promotions lawyer:

1. The **official rules** at `/rules` — a draft, written from the brief.
2. The **refund policy** at `/refund`.
3. The **privacy policy** at `/privacy`, especially the heart-rate section.
4. The **waiver** — **[we do not have one]**. Entrants currently consent to "the
   contest rules, waiver and being filmed" on the form, but no waiver document
   exists yet. Either write one or remove the reference.
5. The **paid-entry structure** itself.

Every page carries a visible "needs lawyer review" notice. Remove it only when
the review is done, and record the date it was reviewed.

---

## 7. Credentials and infrastructure

| What | Owner | Notes |
| --- | --- | --- |
| **[BLOCKING]** Managed PostgreSQL database | You | The demo runs in memory, which **resets on every deploy**. On a serverless host two requests can even see different counts. Vercel Postgres or Neon both work. |
| **[BLOCKING]** Resend account and a verified sending domain | You | Without it, confirmation emails print to the server log and nobody receives a ticket link. |
| **[BLOCKING]** `NEXT_PUBLIC_SITE_URL` | You | Must be `https`. It is what canonical links and every ticket link in an email are built from. |
| Admin password and session secret | You | Only needed if you want the dashboard. |

---

## 8. Marketing and operations

| What | Owner | Why it matters |
| --- | --- | --- |
| **[BLOCKING]** Who approves marketing copy and sends the emails | You | `docs/EMAIL_PLAN.md` describes the sequence; it is not built. |
| Whether milestone emails need separate consent | You | Registration is a paid transaction, which is transactional consent, not marketing consent. Settle this before the first campaign. |
| Support capacity | You | A comparable campaign received ~1.7 lakh applications in 3–4 weeks and needed thousands of replies. Decide who answers, and how fast. |
| Content moderation for filmed footage | You | The event is filmed. Decide who reviews footage before publication. |

---

## 9. Two questions worth answering early

**How will people actually reach 200,000?** The date unlocks at that number, and
the site is built to be honest about it: below 500 paid registrations the counter
shows the target and the story rather than a number, and the number is only ever
shown when it is real. A contest that visibly stalls at 40 of 200,000 damages the
brand more than a contest that never launched.

**Is 200,000 right?** If the realistic figure is 20,000, changing one constant
(`SITE.goal` in `src/content/site.ts`) updates the counter, the facts bar, the
rules, the refund policy, the emails and the sitemap at once. If it is not
realistic, say so now rather than after launch.