/**
 * Public build-time flags.
 *
 * Only values that are safe to ship to the browser, and only ones the client
 * component tree needs. Kept separate from `lib/env.ts`, which holds secrets
 * and must never be imported from a client component.
 */

/**
 * True only when the payment provider is really Stripe.
 *
 * The trust strip says "Payments are processed by Stripe" only when that is
 * true. Claiming a processor we are not using is worse than saying nothing, and
 * a homemade padlock icon conveys nothing at all.
 *
 * NEXT_PUBLIC_STRIPE_ENABLED is set in the deployment environment alongside the
 * secret keys, so the two cannot disagree.
 */
export const stripeLive = process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

/**
 * Development fallback for the site origin.
 *
 * Defined here, once, rather than in `content/site.ts` and again in
 * `lib/env.ts`. It is a development default and must never reach a visitor: a
 * production deployment without an explicit site URL would otherwise emit
 * `localhost` into the JSON-LD, robots.txt and sitemap.xml, telling a crawler
 * the canonical address of the site is a private machine.
 *
 * Living here also keeps it out of `content/`, so the build-time integrity
 * check can treat `localhost` appearing in content as a genuine mistake rather
 * than having to know about this one legitimate fallback.
 */
export const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * True when the deployment is using the mock payment provider.
 *
 * A production deployment left on the mock provider takes no money and issues
 * no real ticket, so the page says so in a persistent banner rather than
 * letting a visitor believe they have paid.
 */
export const mockPayments = !stripeLive;