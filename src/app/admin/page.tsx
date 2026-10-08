import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { adminEnabled } from '@/lib/env';
import { destroySession, isAuthenticated } from '@/lib/auth';
import { ADMIN } from '@/content/site';
import { AdminLogin } from '@/components/sections/AdminLogin';
import { AdminTable } from '@/components/sections/AdminTable';
import { SignOutButton } from '@/components/sections/SignOutButton';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const revalidate = 0;

const PAGE_SIZE = 25;

/**
 * Admin dashboard.
 *
 * Gated by a signed httpOnly cookie. Nothing here is ever logged; the CSV
 * export is the only path that moves personal data out of the app.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!adminEnabled) {
    return (
      <Shell>
        <div className="mx-auto max-w-sm rounded-lg border-2 border-pillow bg-indigo/80 p-8 text-center">
          <h1 className="font-display text-xl font-black uppercase text-cream">
            Admin not configured
          </h1>
          <p className="mt-3 text-body-sm text-lavender">
            Set <code className="font-mono text-zzz">ADMIN_PASSWORD</code> and{' '}
            <code className="font-mono text-zzz">SESSION_SECRET</code> in your
            environment to enable this page.
          </p>
        </div>
      </Shell>
    );
  }

  if (!(await isAuthenticated())) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const { q, page } = await searchParams;
  const query = (q ?? '').trim();
  const current = Math.max(1, Number(page) || 1);

  const where = query
    ? {
        OR: [
          { fullName: { contains: query } },
          { email: { contains: query } },
        ],
      }
    : {};

  const [registrations, total, paid, referred, maxMat] = await Promise.all([
    db.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.registration.count(),
    db.registration.count({ where: { status: 'paid' } }),
    db.registration.count({ where: { referredBy: { not: null } } }),
    db.registration.findFirst({
      where: { matNumber: { not: null } },
      orderBy: { matNumber: 'desc' },
      select: { matNumber: true },
    }),
  ]);

  const signOut = async () => {
    'use server';
    await destroySession();
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-black uppercase text-cream">
            {ADMIN.title}
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/export"
              className="inline-flex min-h-11 items-center rounded-pill border-2 border-dusk px-5 text-body-sm font-bold text-cream hover:bg-dusk/40"
            >
              {ADMIN.export}
            </a>
            <form action={signOut}>
              <SignOutButton />
            </form>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: ADMIN.total, value: paid },
            { label: 'All registrations', value: total },
            { label: ADMIN.referrals, value: referred },
            {
              label: ADMIN.matRange,
              value: maxMat?.matNumber ?? 0,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border-2 border-dusk bg-indigo/70 p-5"
            >
              <dt className="font-mono text-[11px] font-bold uppercase tracking-widest text-lavender">
                {stat.label}
              </dt>
              <dd className="mt-2 font-mono text-3xl font-bold text-zzz tabular-nums">
                {stat.value.toLocaleString('en-US')}
              </dd>
            </div>
          ))}
        </dl>

        <AdminTable registrations={registrations} query={query} current={current} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { readonly children: React.ReactNode }) {
  return (
    <main id="main" className="relative min-h-svh bg-midnight">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
        }}
      />
      <div className="content-frame relative z-10 flex min-h-svh flex-col justify-center py-20">
        {children}
        <p className="mx-auto mt-10 text-center text-body-sm text-lavender">
          <Link href="/" className="underline decoration-dusk underline-offset-4 hover:text-zzz">
            Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}