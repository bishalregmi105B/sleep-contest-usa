import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { env, isProduction, resendEnabled, adminEnabled } from '@/lib/env';
import { getStore } from '@/lib/store';
import { stripeLive as publicStripeLive } from '@/lib/env-public';

/**
 * GET /api/health
 *
 * Reports which providers are active so a deployment can be checked without
 * reading logs. Reports **whether** a provider is configured and nothing else:
 * no key, no host, no connection string. A health endpoint that leaks
 * configuration is a health endpoint that gets scraped.
 *
 * `degraded` is the field to alert on. It means a provider the site expects to
 * use is not actually in use, which is exactly the mistake that leaves a
 * production deployment quietly taking no money.
 */
export async function GET() {
  await connection();

  const store = getStore();
  const providers = {
    database: store.kind,
    payments: publicStripeLive ? 'stripe' : 'mock',
    email: resendEnabled ? 'resend' : 'console',
    admin: adminEnabled ? 'enabled' : 'disabled',
  };

  // The in-memory store is fine for a demo and wrong for a launch: it lives in
  // one server instance and resets whenever that instance is replaced, so a
  // serverless deploy would show a different count on every request.
  const durable = store.kind === 'database';
  const mockPaymentsInProduction = isProduction && !publicStripeLive;

  const problems: string[] = [];
  if (isProduction && !durable) {
    problems.push(
      'In-memory store in production: the registration count resets on every deploy and may differ between requests. Set DATABASE_URL to a managed PostgreSQL database.',
    );
  }
  if (mockPaymentsInProduction) {
    problems.push(
      'Payments are simulated in production: no money is taken and no ticket is issued for real. Set the Stripe keys and NEXT_PUBLIC_STRIPE_ENABLED=true.',
    );
  }
  if (!resendEnabled && isProduction) {
    problems.push(
      'Email falls back to the console provider in production: nobody receives a confirmation or a ticket link.',
    );
  }
  if (!env.siteUrl.startsWith('https://')) {
    problems.push(
      'NEXT_PUBLIC_SITE_URL is not https, so ticket links in confirmation emails will point somewhere unusable.',
    );
  }

  let storeReachable = true;
  try {
    await store.countAll();
  } catch {
    storeReachable = false;
    problems.push('The store could not be read. Check DATABASE_URL and run `npm run db:push`.');
  }

  const ok = problems.length === 0;

  return NextResponse.json(
    {
      ok,
      status: ok ? 'ok' : 'degraded',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: isProduction ? 'production' : 'development',
      providers,
      secretsConfigured: {
        // Presence only, never the value.
        stripe: Boolean(env.stripeSecretKey),
        resend: Boolean(env.resendApiKey),
        sessionSecret: Boolean(env.sessionSecret),
      },
      durableStorage: durable,
      storeReachable,
      problems,
    },
    {
      // Never cached: this is the endpoint you check when something is wrong.
      headers: { 'Cache-Control': 'no-store' },
      status: ok ? 200 : 503,
    },
  );
}
