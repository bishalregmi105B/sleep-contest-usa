'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Analytics.
 *
 * Vercel's Analytics and Speed Insights, which are cookie-free and send no
 * personal data. Both are documented in the privacy page rather than left as an
 * undeclared third party.
 *
 * Mounted only on Vercel. The scripts are served from `/_vercel/*` by the Vercel
 * edge, so mounting them anywhere else produces a 404 and a console error on
 * every page load — which a self-hosted deployment, a preview server and a
 * developer's laptop all are. Absence is the correct behaviour off-platform;
 * the privacy page describes what is collected either way.
 */
const onVercel = process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined;

export function AnalyticsProvider() {
  if (!onVercel) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}