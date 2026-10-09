import { NextResponse, connection } from 'next/server';
import {
  adminEnabled,
  env,
  isProduction,
  mockPaymentsAllowed,
  paymentsEnabled,
  redisEnabled,
  resendEnabled,
  stripeEnabled,
  turnstileEnabled,
  validateEnv,
} from '@/lib/env';
import { pingDatabase } from '@/lib/db';
import { kvStatus } from '@/lib/kv';


/**
 * GET /api/health
 *
 * Configuration report. Reports **whether** a provider is configured and
 * nothing else — no key, no host, no connection string. A health endpoint that
 * leaks configuration is a health endpoint that gets scraped.
 *
 * `status: degraded` is the field to alert on. It means a provider the site
 * expects to use is not actually in use, which is exactly the mistake that
 * leaves a production deployment quietly taking no money.
 *
 * This is separated from `/api/ready`, which is for load balancers: this one is
 * for humans, and answers "is the configuration right", not "can it serve".
 */
export async function GET() {
  await connection();

  const database = await pingDatabase();
  const { problems, advisory } = validateEnv();
  const kv = kvStatus();

  const findings: string[] = [...problems.map((p) => `${p.variable} ${p.message}`), ...advisory];

  if (isProduction && !database) {
    findings.push('The database is not reachable. Check DATABASE_URL and that migrations have run.');
  }
  if (isProduction && !paymentsEnabled) {
    findings.push(
      'Payments are not configured. The site will NOT issue tickets and will serve a waitlist instead. This is deliberate: a ticket without a payment is worse than no ticket.',
    );
  }
  if (isProduction && !resendEnabled) {
    findings.push('Email is not configured. Confirmations will queue in the outbox and never arrive.');
  }

  const ok = isProduction ? findings.length === 0 : database;

  return NextResponse.json(
    {
      ok,
      status: ok ? 'ok' : 'degraded',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: isProduction ? 'production' : 'development',
      databaseReachable: database,
      providers: {
        database: 'postgresql',
        payments: paymentsEnabled ? 'stripe' : 'none',
        email: resendEnabled ? 'resend' : 'console',
        admin: adminEnabled ? 'enabled' : 'disabled',
        redis: kv.kind,
        turnstile: turnstileEnabled ? 'enabled' : 'disabled',
      },
      // Presence only, never the value.
      secretsConfigured: {
        stripe: Boolean(env.stripeSecretKey),
        stripeWebhook: Boolean(env.stripeWebhookSecret),
        resend: Boolean(env.resendApiKey),
        sessionSecret: Boolean(env.sessionSecret),
        adminPasswordHash: Boolean(env.adminPasswordHash),
        cronSecret: Boolean(env.cronSecret),
        ipPepper: Boolean(env.ipPepper),
        turnstile: turnstileEnabled,
        redis: redisEnabled,
        mockPaymentsAllowed,
      },
      siteUrlIsHttps: env.siteUrl.startsWith('https://'),
      problems: findings,
    },
    {
      // Never cached: this is the endpoint you check when something is wrong.
      headers: { 'Cache-Control': 'no-store' },
      status: ok ? 200 : 503,
    },
  );
}
