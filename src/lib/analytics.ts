/**
 * Analytics events.
 *
 * **No event carries personal data.** No name, no email, no mat number, no
 * city, nothing that could identify a registrant or re-identify a referrer. The
 * whole event list is five event names and, at most, a shape.
 *
 * A referral code is deliberately excluded: it is a persistent, shareable
 * identifier, and pairing it with a timestamp turns a "how did people find us"
 * question into a way to watch an individual entrant move through the site.
 *
 * The funnel the client actually needs is server-side: how many registrations
 * were started, and how many were paid for. Those two numbers are counted by
 * the store and shown in /admin.
 */

/** Fired when a primary "reserve" link is pressed. */
export const RESERVE_CLICK = 'reserve_click';
/** Fired once, the first time any form field is edited. */
export const FORM_START = 'form_start';
/** Fired on a successful POST to /api/register. */
export const REGISTERED = 'registered';
/** Fired when the copy-link or Web Share control is used. */
export const SHARE_CLICK = 'share_click';

/**
 * Fired when the form is actually submitted, and `registered` once the server
 * has created the registration. Both carry no payload.
 */
export const FORM_SUBMIT = 'form_submit';

type Payload = Record<string, string | number | boolean> | undefined;

/**
 * Small wrapper so a missing or blocked analytics library never throws into a
 * caller's event handler. Analytics failing must never fail a registration.
 */
export function track(event: string, payload?: Payload): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = (window as unknown as { __vaq?: unknown[] }).__vaq;
    if (Array.isArray(queue)) queue.push(['event', event, payload]);
  } catch {
    /* Analytics is best-effort. Never let it break the page. */
  }
}