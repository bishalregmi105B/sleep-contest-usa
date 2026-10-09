/**
 * Public progress display.
 *
 * Pure, and deliberately free of any database, cache or settings access, so the
 * rules about what the public is shown can be unit-tested exhaustively without
 * standing anything up. That matters here more than usual: this function
 * decides what number a visitor believes is true, and the client's brief asked
 * for a specific display rule (Section 3.4 of the change request).
 *
 * The rule, in full:
 *
 *  - Below `counterMinPublic`, show the target and the story. No number. A page
 *    showing "0 / 200,000" reads as a dead campaign.
 *  - At or above it, show `{count} / {currentMilestone}`, the milestone's
 *    position in the ladder, a bar toward the current milestone, the running
 *    total against the goal, and the permanent final goal.
 *  - At or above the goal, the ladder is complete and the display says so.
 *
 * `count` is always the real paid, non-internal count from the database. There
 * is no offset, seed or multiplier anywhere in this file, and `npm run
 * check:integrity` fails the build if one is ever added.
 */

export type ProgressInput = {
  /** Real paid, non-internal registrations. Never adjusted. */
  readonly paidCount: number;
  readonly milestones: readonly number[];
  readonly goal: number;
  readonly counterMinPublic: number;
};

export type Progress =
  /** Below the public threshold: show the target, no number. */
  | { readonly kind: 'hidden'; readonly copy: string; readonly goalLine: string }
  /** Between the threshold and the first milestone. */
  | {
      readonly kind: 'progress';
      readonly count: number;
      /** Milestone currently being worked toward. */
      readonly currentMilestone: number;
      /** 1-based position in the ladder. */
      readonly milestoneIndex: number;
      /** Total number of milestones, including the goal. */
      readonly milestoneCount: number;
      /** 0..1 toward the current milestone. */
      readonly fraction: number;
      /** "3 of 9" */
      readonly label: string;
      /** "{count} of {goal} overall" */
      readonly overall: string;
      /** "Final goal: 200,000 sleepers" */
      readonly goalLine: string;
    }
  /** Every milestone reached, including the goal. */
  | {
      readonly kind: 'complete';
      readonly count: number;
      readonly milestoneIndex: number;
      readonly milestoneCount: number;
      readonly goalLine: string;
    };

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

function withCommas(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * The current milestone: the first entry in the ladder the count has not yet
 * reached.
 *
 * At exactly a milestone the display advances to the next one, which is why the
 * comparison is `>=` when looking backwards and the index scan uses `<=`.
 */
export function currentMilestoneIndex(
  count: number,
  milestones: readonly number[],
): number {
  let index = 0;
  for (let i = 0; i < milestones.length; i += 1) {
    if (count >= (milestones[i] as number)) index = i + 1;
  }
  return index;
}

export function getProgress(input: ProgressInput): Progress {
  const { paidCount, milestones, goal, counterMinPublic } = input;

  const goalLine = `Final goal: ${withCommas(goal)} sleepers`;

  // Nothing is shown as a number until the campaign has real momentum. This is
  // the same threshold the previous implementation used, now configurable.
  if (paidCount < counterMinPublic) {
    return {
      kind: 'hidden',
      copy: `Registration is open. We need ${withCommas(goal)} sleepers.`,
      // Shown in every state: the goal does not become secret because the count
      // is not yet public.
      goalLine,
    };
  }

  const ladder = milestones.length > 0 ? [...milestones].sort((a, b) => a - b) : [goal];
  const reached = currentMilestoneIndex(paidCount, ladder);

  if (reached >= ladder.length) {
    return {
      kind: 'complete',
      count: paidCount,
      milestoneIndex: reached,
      milestoneCount: ladder.length,
      goalLine,
    };
  }

  const currentMilestone = ladder[reached] as number;

  // Progress toward the current milestone, measured from the previous rung so
  // the bar starts at zero on each new milestone rather than jumping to
  // wherever the count happens to sit.
  const previousMilestone = reached === 0 ? 0 : (ladder[reached - 1] as number);
  const span = Math.max(1, currentMilestone - previousMilestone);
  const raw = (paidCount - previousMilestone) / span;
  const fraction = Math.min(1, Math.max(0, raw));

  return {
    kind: 'progress',
    count: paidCount,
    currentMilestone,
    milestoneIndex: reached + 1,
    milestoneCount: ladder.length,
    fraction,
    label: `Milestone ${reached + 1} of ${ladder.length}`,
    overall: `${withCommas(paidCount)} of ${withCommas(goal)} overall`,
    goalLine,
  };
}

/**
 * Whether the register form should offer a checkout.
 *
 * Distinct from "registration is open": the kill switch and the capacity cap
 * are separate controls, and the form has to render a different state for each.
 */
export type RegistrationState =
  | { readonly kind: 'open' }
  /** Kill switch on. The waitlist stays open, because interest is worth keeping. */
  | { readonly kind: 'closed'; readonly reason: 'not_open'; readonly waitlistAvailable: true }
  | { readonly kind: 'full'; readonly waitlistAvailable: true }
  /** Payments are not configured. Never issue a ticket. */
  | { readonly kind: 'payments_unavailable'; readonly waitlistAvailable: true };

export function registrationState(input: {
  readonly registrationOpen: boolean;
  readonly maxRegistrations: number;
  readonly reserved: number;
  readonly paymentsEnabled: boolean;
}): RegistrationState {
  if (!input.registrationOpen) {
    // Registration being switched off is usually temporary — a broadcast slot, a
    // maintenance window. Letting someone leave their email costs nothing and
    // is how they hear when it reopens.
    return { kind: 'closed', reason: 'not_open', waitlistAvailable: true };
  }
  // Checked before capacity: if we cannot take money, no amount of free space
  // is useful, and the honest message is that payment is unavailable.
  if (!input.paymentsEnabled) return { kind: 'payments_unavailable', waitlistAvailable: true };
  if (input.reserved >= input.maxRegistrations) {
    return { kind: 'full', waitlistAvailable: true };
  }
  return { kind: 'open' };
}

export { withCommas, plural };