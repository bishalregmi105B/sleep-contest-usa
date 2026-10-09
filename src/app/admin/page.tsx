import type { Metadata } from 'next';
import Link from 'next/link';
import {
  countReferred,
  dailyPaid,
  highestMat,
  listRegistrations,
  topRecruiters,
  totalRegistrations,
} from '@/lib/repository';
import { currentReserved, paidCount } from '@/lib/capacity';
import { adminEnabled } from '@/lib/env';
import { destroySession, isAuthenticated } from '@/lib/auth';
import { ADMIN } from '@/content/site';
import { AdminLogin } from '@/components/sections/AdminLogin';
import { AdminTable } from '@/components/sections/AdminTable';
import { AdminSettingsForm } from '@/components/sections/AdminSettingsForm';
import { AdminHealthCard } from '@/components/sections/AdminHealthCard';
import { getSettings, gwrGuard } from '@/lib/settings';
import { outboxHealth } from '@/lib/outbox';
import { waitlistSize } from '@/lib/registrations';
import {
  DailyChart,
  Funnel,
  Panel,
  ReferralLeaders,
} from '@/components/sections/AdminDashboard';
import { SignOutButton } from '@/components/sections/SignOutButton';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Dynamic by nature: it reads the session cookie and the live registration
 * table. `instant = false` lets Next render it at request time rather than
 * blocking a prerender pass it can never satisfy.
 */
export const instant = false;


/**
 * Keyset cursor for a given 1-based page number.
 *
 * Page 1 starts from the top. Deeper pages are resolved client-side by
 * following the `nextCursor` the API returns, so this is a best-effort jump for
 * a directly-linked page number; sequential browsing always uses the cursor.
 */
function cursorFrom(page: number) {
  if (page <= 1) return null;
  return undefined;
}

const PAGE_SIZE = 25;

/** How many days the dashboard chart covers. */
const CHART_DAYS = 30;

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
        <div className="mx-auto max-w-sm rounded-lg border-2 border-signal bg-indigo/40/80 p-8 text-center">
          <h1 className="font-display text-xl font-black uppercase text-paper">
            Admin not configured
          </h1>
          <p className="mt-3 text-sm text-mist">
            Set <code className="font-mono text-tungsten">ADMIN_PASSWORD</code> and{' '}
            <code className="font-mono text-tungsten">SESSION_SECRET</code> in your
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


  const [pageResult, total, paid, daily, leaders, reserved, settings, outbox, waitlist, referred, maxMat] =
    await Promise.all([
    listRegistrations({
      limit: PAGE_SIZE,
      cursor: cursorFrom(current),
      query: query || undefined,
    }),
    totalRegistrations(),
    paidCount(),
    dailyPaid(CHART_DAYS),
    topRecruiters(5),
    currentReserved(),
    getSettings(),
    outboxHealth(),
    waitlistSize(),
    countReferred(),
    highestMat(),
  ]);

  // Keyset pagination: page N resumes from the cursor the previous page
  // returned, instead of skipping N * PAGE_SIZE rows in the database.
  const registrations = pageResult.rows;
  // Advisory only. The badge shows either way; this just makes the paperwork
  // state visible on the page an operator actually looks at.
  const gwrNote = gwrGuard(settings);
  // Registrations that have not reached a paid state, for the funnel.
  const unpaid = total - paid;

  const signOut = async () => {
    'use server';
    await destroySession();
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-black uppercase text-paper">
            {ADMIN.title}
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/export"
              className="inline-flex min-h-11 items-center rounded-pill border border-white/20 px-5 text-sm font-medium text-paper transition-colors hover:bg-white/5"
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
            { label: ADMIN.matRange, value: maxMat },
          ].map((stat) => (
            <div
              key={stat.label}
              className="panel p-5"
            >
              <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist">
                {stat.label}
              </dt>
              <dd className="mt-2 font-mono text-3xl font-bold text-tungsten tabular-nums">
                {stat.value.toLocaleString('en-US')}
              </dd>
            </div>
          ))}
        </dl>

        {/* Three panels above the table: what came in, what completed, and who
            brought whom. */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Panel title={ADMIN.dailyTitle}>
            <DailyChart data={daily} caption={`Paid registrations over the last ${CHART_DAYS} days`} />
          </Panel>

          <div className="space-y-6">
            <Panel title={ADMIN.funnelTitle}>
              <Funnel total={total} paid={paid} unpaid={unpaid} />
            </Panel>
            <Panel title={ADMIN.leadersTitle}>
              <ReferralLeaders leaders={leaders} />
            </Panel>
          </div>
        </div>

        <div className="mt-8">
          <Panel title="Health">
            <AdminHealthCard
              reserved={reserved}
              maxRegistrations={settings.maxRegistrations}
              paid={paid}
              total={total}
              waitlist={waitlist}
              outbox={outbox}
              settings={settings}
              gwrNote={gwrNote}
            />
          </Panel>
        </div>

        <div className="mt-8">
          <Panel title="Settings">
            <AdminSettingsForm initial={settings} currentCount={paid} />
          </Panel>
        </div>

        <AdminTable
          registrations={registrations.map((row) => ({
            publicId: row.publicId,
            matNumber: row.matNumber,
            fullName: row.fullName,
            email: row.email,
            // The column is now stored normalised to E.164; the table labels it
            // "mobile" because that is what the entrant entered.
            mobile: row.mobileE164,
            cityState: row.cityState,
            status: row.status,
            referredBy: row.referredBy,
            paidAt: row.paidAt,
          }))}
          query={query}
          current={current}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { readonly children: React.ReactNode }) {
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
      <div className="content-frame relative z-10 flex min-h-svh flex-col justify-center py-20">
        {children}
        <p className="mx-auto mt-10 text-center text-sm text-mist">
          <Link href="/" className="underline decoration-dusk underline-offset-4 hover:text-tungsten">
            Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}