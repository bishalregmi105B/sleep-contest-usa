import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '@/lib/store';
import { env } from '@/lib/env';
import { FRIENDS, SITE } from '@/content/site';
import { ReferralShare } from '@/components/sections/ReferralShare';

export const metadata: Metadata = {
  title: FRIENDS.title,
  description: FRIENDS.sub,
  alternates: { canonical: '/friends' },
};

/**
 * The leaderboard is live, so the page cannot be prerendered: `instant = false`
 * renders it at request time.
 */
export const instant = false;

/**
 * Referral page.
 *
 * Top recruiters are shown by mat number and referral count only. Publishing
 * names next to a leaderboard would expose entrants who never asked to be
 * public.
 */
export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const code = ref?.trim().toUpperCase() ?? '';
  const link = `${env.siteUrl}/friends${code ? `?ref=${code}` : ''}`;

  // Aggregate referrals by code, then take the top five.
  let recruiters: { refCode: string; matNumber: number | null; count: number }[] = [];

  try {
    recruiters = await getStore().topRecruiters(5);
  } catch (err) {
    console.error(
      '[friends] failed to read recruiters:',
      err instanceof Error ? err.message : 'unknown',
    );
  }

  return (
    <main id="main" className="relative min-h-svh bg-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
        }}
      />

      <div className="content-frame relative z-10 flex min-h-svh flex-col justify-center gap-10 py-20">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl font-black uppercase text-paper sm:text-4xl">
            {FRIENDS.title}
          </h1>
          <p className="mt-4 text-lg text-mist">{FRIENDS.sub}</p>
        </header>

        {code ? (
          <ReferralShare link={link} />
        ) : (
          <p className="max-w-2xl rounded-lg border-2 border-white/10 bg-indigo/40/70 p-6 text-base text-mist">
            Open the link on your ticket to see your personal referral link. Top
            recruiters are listed below.
          </p>
        )}

        <section aria-labelledby="top-recruiters" className="max-w-2xl">
          <h2
            id="top-recruiters"
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-mint"
          >
            {FRIENDS.topRecruiters}
          </h2>
          <p className="mt-2 text-sm text-mist/80">{FRIENDS.topRecruitersNote}</p>

          {recruiters.length === 0 ? (
            <p className="mt-4 text-base text-mist">{FRIENDS.empty}</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {recruiters.map((row, index) => (
                <li
                  key={row.refCode}
                  className="flex items-center justify-between rounded-md border-2 border-white/10 bg-indigo/40/70 px-5 py-3"
                >
                  <span className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-8 place-items-center rounded-full bg-tungsten font-mono text-sm font-bold text-ink"
                    >
                      {index + 1}
                    </span>
                    <span className="font-mono text-paper">
                      Mat{' '}
                      {row.matNumber === null
                        ? 'pending'
                        : `#${row.matNumber.toLocaleString('en-US')}`}
                    </span>
                  </span>
                  <span className="font-mono text-sm text-tungsten">
                    {row.count} referral{row.count === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p>
          <Link href="/" className="text-sm text-mist underline decoration-dusk underline-offset-4 hover:text-tungsten">
            Back to {SITE.name}
          </Link>
        </p>
      </div>
    </main>
  );
}