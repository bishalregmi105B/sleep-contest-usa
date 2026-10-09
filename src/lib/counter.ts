import { COUNTER, SITE } from '@/content/site';

/**
 * How the counter is allowed to appear in public.
 *
 * A contest page showing "0 / 200,000" reads as a dead campaign, and a
 * fabricated or inflated number backfires the moment it is checked. So the
 * numeric count is shown only once it is at or above a real threshold; below
 * it, the page states the target and the story, which is both true and
 * inviting. The admin view is unaffected and always shows the true total.
 *
 * Mock registrations are excluded upstream by the store, so a preview can
 * never inflate the number a visitor sees.
 */
export type CounterDisplay =
  | { readonly kind: 'count'; readonly count: number }
  | { readonly kind: 'target'; readonly copy: string }
  | { readonly kind: 'starting'; readonly copy: string };

export function counterDisplay(count: number, min = SITE.counterMinPublic): CounterDisplay {
  if (count <= 0) {
    return { kind: 'starting', copy: COUNTER.noneYet };
  }

  if (count < min) {
    return { kind: 'target', copy: COUNTER.belowThreshold };
  }

  return { kind: 'count', count };
}

/** True when the real number may be shown to the public. */
export function counterIsPublic(count: number, min = SITE.counterMinPublic): boolean {
  return counterDisplay(count, min).kind === 'count';
}