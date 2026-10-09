# Email plan

**Status: described, not built.** Only the confirmation email sends today. The
rest of this document is the sequence to implement once the contest has a real
launch date and a real email provider, and it is written so that whoever builds
it does not have to invent the policy.

One rule governs everything below: **a registrant hears from us only when there
is something for them to do, or something they asked to hear about.** A paid
entry with a $10 balance outstanding is a bad place to be noisy.

## What sends today

| Email | Trigger | Purpose |
| --- | --- | --- |
| Confirmation | Payment succeeds | Mat number, ticket link, three-step next, refund promise, rules |

Rendered in `src/lib/email/templates.ts`, sent through Resend when
`RESEND_API_KEY` and `EMAIL_FROM` are set, and printed to the terminal
otherwise. One template, two providers, so what is tested is what is delivered.

Subject line: `You're in. Your mat number is {matNumber}.` — the mat number is
the only thing an entrant looks for.

## The sequence to build

All copy and dates below are **[CLIENT]**: the milestones depend on a real
campaign and none of them can be written before there is a launch date.

### 1. Milestone updates

Sent to registrants when the paid count crosses a threshold.

| Trigger | Subject | Point |
| --- | --- | --- |
| 10% of {GOAL} | `We're 20,000 sleepers in` | Momentum, not urgency |
| 25% | `A quarter of the way` | Honest milestone |
| 50% | `Halfway there` | The halfway point is worth marking |
| 75% | `Three quarters — here's where we are` | Sets up the finish |
| 100% | `We're there. Your date is coming.` | The date announcement follows immediately after |

Rules:
- **Never round the number down.** "Nearly 20,000" when the count is 19,412 is
  the kind of small dishonesty that costs a contest its credibility, and it is
  visible in the counter on the same site.
- One per threshold. If the count jumps past two at once, send the highest only.
- Suppress anyone who has already unsubscribed or refunded.
- Suppress the 100% milestone if the date-announcement email is going out within
  24 hours; two emails saying the same thing is worse than one.

### 2. Date and venue announced

Sent to every registrant the moment the date is set. This is the email the
entire contest has been building toward, and it carries the payment link.

Subject: `Your mat is real. Here's the date.` — plain, and it is the only email
that may be worth opening urgently.

Contains: date, venue, cities, arrival time, what is provided (mat, pillow),
what to bring (pajamas, photo ID), the payment link for the remaining
$29.99, and the refund promise restated in full.

Restating the refund promise here matters more than anywhere else: this is the
moment the visitor finds out the reservation is conditional.

### 3. Payment reminder

Before the payment deadline. One only.

Subject: `Your mat is held until {DATE}`

### 4. Event reminder

Seven days out, then the morning of.

Subject: `Tonight: {DATE}, {VENUE}`

### 5. Refund notice

Sent to everyone if the goal is not reached by the deadline, or if the contest
is cancelled for any reason.

Subject: `The contest isn't happening. Your refund is on its way.`

This one is not optional and not delayed by a marketing schedule. Money is
returned first; the explanation follows if it is needed at all.

## What must be decided before any of this is built

- [ ] **[CLIENT]** Who sends the emails and who approves copy.
- [ ] **[CLIENT]** The real deadline for reaching {GOAL}.
- [ ] **[CLIENT]** Whether milestone emails go to everyone or only to people who
      gave us permission to email them. Registration is a paid transaction, which
      is transactional consent, not marketing consent; this distinction should be
      settled before the first milestone, not after.
- [ ] **[CLIENT]** Whether registrants can opt out of milestone emails and
      still receive the date announcement and the refund notice.
- [ **[CLIENT]** Bounce and complaint handling, and who is paged if the
      complaint rate rises.

## Deliverability

- Authenticate the sending domain with SPF, DKIM and DMARC before the first
  campaign. An unverified domain sending 200,000 emails lands in spam.
- Warm the domain. A domain that has never sent mail should start with a few
  hundred registrants and build up.
- Keep the HTML to tables and inline styles; the current template is written
  that way for exactly this reason, and Outlook is the reason, not nostalgia.
- Include a plain-text alternative. Every send does.

## Not doing

- No countdown emails in the final week. Scarcity applied to a sleep contest is
  both off-message and the fastest way to lose a registrant's goodwill.
- No "last chance" for the date. The date is announced once; it is not a sale.
- No daily progress emails. Milestones are for crossing a line, not for the
  days between them.