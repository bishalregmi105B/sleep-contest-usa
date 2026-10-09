/**
 * Server-side environment access and startup validation.
 *
 * The previous version of this file made every variable optional and fell back
 * to an in-memory store and a mock payment provider. That meant a production
 * deploy missing its database URL started cleanly and then lost registrations,
 * and a production deploy missing its Stripe key handed out paid tickets for
 * free. Neither failure is visible at boot; both are visible to the client.
 *
 * So: in production, a missing required variable is a startup failure naming
 * the variable. In development and test, everything is optional and the site
 * degrades to safe, clearly-labelled local behaviour.
 */

const read = (key: string): string => process.env[key]?.trim() ?? '';

export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
export const isDevelopment = !isProduction && !isTest;

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

export const env = {
  siteUrl: read('NEXT_PUBLIC_SITE_URL'),
  databaseUrl: read('DATABASE_URL'),
  /** Direct (non-pooled) connection string, used only by `prisma migrate`. */
  directUrl: read('DIRECT_URL'),

  redisUrl: read('REDIS_URL'),
  upstashUrl: read('UPSTASH_REDIS_REST_URL'),
  upstashToken: read('UPSTASH_REDIS_REST_TOKEN'),

  stripeSecretKey: read('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: read('STRIPE_WEBHOOK_SECRET'),
  stripePriceCents: Number(read('STRIPE_PRICE_CENTS') || '1000'),

  resendApiKey: read('RESEND_API_KEY'),
  emailFrom: read('EMAIL_FROM'),

  turnstileSiteKey: read('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
  turnstileSecretKey: read('TURNSTILE_SECRET_KEY'),

  adminPasswordHash: read('ADMIN_PASSWORD_HASH'),
  sessionSecret: read('SESSION_SECRET'),
  cronSecret: read('CRON_SECRET'),
  sentryDsn: read('SENTRY_DSN'),

  /** Salt for hashing client IPs before they are stored. */
  ipPepper: read('IP_PEPPER'),

  seedDemo: read('SEED_DEMO') === 'true',
} as const;

/**
 * Mock payments, honoured ONLY in development and test.
 *
 * In production this is false no matter what the environment says, so no
 * configuration mistake can turn a paid site into one that gives away prize
 * eligibility for free.
 */
export const mockPaymentsAllowed =
  (isDevelopment || isTest) && read('MOCK_PAYMENTS') === 'true';

// ---------------------------------------------------------------------------
// Derived capabilities
// ---------------------------------------------------------------------------

/** True when the real payment provider is fully configured. */
export const stripeEnabled = Boolean(env.stripeSecretKey && env.stripeWebhookSecret);

/**
 * Whether the site may issue a ticket for money.
 *
 * False in production without Stripe keys — the case that used to fall through
 * to the mock provider and hand out free tickets. The register and checkout
 * routes serve a waitlist state instead.
 */
export const paymentsEnabled = isProduction ? stripeEnabled : stripeEnabled || mockPaymentsAllowed;

export const resendEnabled = Boolean(env.resendApiKey && env.emailFrom);
export const turnstileEnabled = Boolean(env.turnstileSecretKey && env.turnstileSiteKey);
export const adminEnabled = Boolean(env.adminPasswordHash && env.sessionSecret);
export const redisEnabled = Boolean(env.upstashUrl && env.upstashToken) || Boolean(env.redisUrl);

export const siteUrl = env.siteUrl || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

type EnvRecord = typeof env;

const REQUIRED_IN_PRODUCTION: ReadonlyArray<readonly [string, (e: EnvRecord) => boolean, string]> = [
  [
    'DATABASE_URL',
    (e) => isPostgresUrl(e.databaseUrl),
    'must be a PostgreSQL connection string. SQLite and the in-memory store are not supported: they lose registrations on a serverless deploy.',
  ],
  ['SESSION_SECRET', (e) => e.sessionSecret.length >= 32, 'must be set and at least 32 characters.'],
  [
    'ADMIN_PASSWORD_HASH',
    (e) => e.adminPasswordHash.startsWith('scrypt.'),
    'must be a scrypt hash, not a plaintext password. Generate one with `npm run admin:hash -- "<password>"`.',
  ],
  ['CRON_SECRET', (e) => e.cronSecret.length >= 24, 'must be set and at least 24 characters.'],
  [
    'STRIPE_SECRET_KEY',
    (e) => e.stripeSecretKey.length > 0,
    'the site takes money and cannot issue tickets without it.',
  ],
  [
    'STRIPE_WEBHOOK_SECRET',
    (e) => e.stripeWebhookSecret.length > 0,
    'without it a payment cannot be verified and no ticket is ever issued.',
  ],
  [
    'RESEND_API_KEY',
    (e) => e.resendApiKey.length > 0,
    'without it confirmations queue in the outbox and nobody receives a ticket.',
  ],
  ['EMAIL_FROM', (e) => e.emailFrom.includes('@'), 'must be a verified sender address.'],
  ['IP_PEPPER', (e) => e.ipPepper.length >= 16, 'must be set and at least 16 characters. Used to hash client IPs.'],
  [
    'NEXT_PUBLIC_SITE_URL',
    (e) => e.siteUrl.startsWith('https://'),
    'must be the https public origin. Ticket links in confirmation emails are built from it.',
  ],
];

/**
 * Problems that do not stop the process but must be surfaced loudly.
 *
 * Redis and Turnstile are deliberately advisory, not required: the site is
 * required to keep taking registrations without either, but it is required to do
 * so without them safely, and that difference matters.
 */
function advisoryProblems(): string[] {
  const out: string[] = [];
  if (!redisEnabled) {
    out.push(
      'No Redis configured (UPSTASH_REDIS_REST_URL or REDIS_URL). Rate limiting falls back to a per-instance limiter and the stats cache falls back to the database. Set one before a traffic spike.',
    );
  }
  if (!turnstileEnabled) {
    out.push('Turnstile is not configured. The form is protected only by rate limits.');
  }
  return out;
}

export type EnvProblem = { variable: string; message: string };

/**
 * Validates the environment. Called on first server-side request and again by
 * /api/health.
 *
 * Returns every problem rather than the first, so a misconfigured deploy is
 * fixed in one pass instead of one variable per deployment.
 */
export function validateEnv(): { ok: boolean; problems: EnvProblem[]; advisory: string[] } {
  const problems: EnvProblem[] = [];

  if (isPostgresUrl(env.databaseUrl) && !env.directUrl) {
    problems.push({
      variable: 'DIRECT_URL',
      message:
        'is required alongside a pooled DATABASE_URL so migrations do not run through the pool. It can point at the same database.',
    });
  }

  if (isProduction) {
    for (const [variable, ok, message] of REQUIRED_IN_PRODUCTION) {
      if (!ok(env)) problems.push({ variable, message });
    }
  }

  return { ok: problems.length === 0, problems, advisory: advisoryProblems() };
}

let startupChecked = false;

/**
 * Logs every configuration problem once, and returns whether the environment is
 * sound. Does **not** throw.
 *
 * Diagnostic routes call this. An operator whose production deploy is
 * misconfigured needs `/admin`, `/api/health` and `/api/ready` to load — those
 * are where the problems are reported and fixed. Crashing those pages turns a
 * configuration mistake into an unreachable site with a generic error page,
 * which is strictly worse than a site that renders and says what is wrong.
 */
export function reportConfiguration(): boolean {
  if (startupChecked || !isProduction) return true;
  startupChecked = true;

  const { problems, advisory } = validateEnv();
  for (const note of advisory) console.warn(`[env] WARNING: ${note}`);

  if (problems.length > 0) {
    for (const p of problems) console.error(`[env] ${p.variable} ${p.message}`);
    return false;
  }
  return true;
}

/**
 * Throws if the environment cannot safely serve money.
 *
 * Called by the routes that take a registration, start a payment, or accept a
 * webhook — the paths where running anyway would issue a ticket without taking
 * payment, or lose a registration. Those refuse loudly on purpose.
 *
 * Lazy rather than at module scope: `next build` imports route modules to
 * analyse them, and throwing at import time would fail the build of an
 * otherwise-correct deployment. A build does not need credentials; a request
 * does.
 */
export function assertServerConfigured(): void {
  if (!isProduction) return;
  if (reportConfiguration()) return;

  const { problems } = validateEnv();
  const detail = problems.map((p) => `  - ${p.variable} ${p.message}`).join('\n');
  throw new Error(
    `Refusing to serve traffic: the environment is not configured for production.\n${detail}\n` +
      'These are startup errors on purpose. Running anyway would issue tickets without taking payment, or lose registrations.',
  );
}