/**
 * Server-side environment access.
 *
 * Everything here is optional: the site runs with no credentials at all.
 * Real providers (Stripe, Resend) switch on only when their key is present.
 */

const read = (key: string): string => process.env[key]?.trim() ?? '';

export const env = {
  siteUrl: read('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
  databaseUrl: read('DATABASE_URL') || 'file:./dev.db',
  adminPassword: read('ADMIN_PASSWORD'),
  sessionSecret: read('SESSION_SECRET'),
  stripeSecretKey: read('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: read('STRIPE_WEBHOOK_SECRET'),
  resendApiKey: read('RESEND_API_KEY'),
  emailFrom: read('EMAIL_FROM'),
  seedDemo: read('SEED_DEMO') === 'true',
} as const;

export const isProduction = process.env.NODE_ENV === 'production';

/** True only when both the key and secret are present. */
export const stripeEnabled = Boolean(env.stripeSecretKey && env.stripeWebhookSecret);
export const resendEnabled = Boolean(env.resendApiKey && env.emailFrom);
/** Admin auth is unusable without a password and a signing secret. */
export const adminEnabled = Boolean(env.adminPassword && env.sessionSecret);