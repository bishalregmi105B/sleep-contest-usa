'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN } from '@/content/site';

export type AdminRow = {
  readonly publicId: string;
  readonly matNumber: number | null;
  readonly fullName: string;
  readonly email: string;
  readonly mobile: string;
  readonly cityState: string;
  readonly status: string;
  readonly referredBy: string | null;
  readonly paidAt: Date | null;
};

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-mint text-ink',
  pending: 'bg-tungsten text-ink',
  refunded: 'bg-mist text-ink',
};

/**
 * Registrations table with search and pagination.
 *
 * Search is a GET form so the result is a shareable, bookmarkable URL and the
 * page stays server-rendered.
 */
export function AdminTable({
  registrations,
  query,
  current,
}: {
  readonly registrations: readonly AdminRow[];
  readonly query: string;
  readonly current: number;
}) {
  const [term, setTerm] = useState(query);

  return (
    <section className="mt-8">
      <form method="get" className="flex flex-wrap gap-3">
        <label htmlFor="admin-search" className="sr-only">
          {ADMIN.search}
        </label>
        <input
          id="admin-search"
          name="q"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={ADMIN.search}
          className="min-h-11 flex-1 rounded-pill border-2 border-white/10 bg-indigo/40/70 px-5 text-base text-paper placeholder:text-mist/60"
        />
        <button
          type="submit"
          className="sticker-btn sticker-btn-yellow !min-h-11 !px-6 !py-2 text-sm"
        >
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border-2 border-white/10">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">
            Contest registrations with mat number, entrant, status and referral
          </caption>
          <thead>
            <tr className="bg-dusk/60">
              {ADMIN.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-paper"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td
                  colSpan={ADMIN.columns.length}
                  className="px-4 py-8 text-center text-base text-mist"
                >
                  {ADMIN.empty}
                </td>
              </tr>
            ) : (
              registrations.map((row) => (
                <tr key={row.publicId} className="border-t border-white/10/60">
                  <td className="px-4 py-3 font-mono text-tungsten">
                    {row.matNumber === null
                      ? '—'
                      : `#${row.matNumber.toLocaleString('en-US')}`}
                  </td>
                  <td className="px-4 py-3 text-paper">{row.fullName}</td>
                  <td className="px-4 py-3 font-mono text-sm text-mist">
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-sm px-2 py-1 font-mono text-xs font-bold uppercase ${
                        STATUS_STYLES[row.status] ?? 'bg-mist text-ink'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-mist">
                    {row.referredBy ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-mist">
                    {row.paidAt ? row.paidAt.toISOString().slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
        <PageLink page={current - 1} query={query} disabled={current <= 1}>
          Previous
        </PageLink>
        <span className="font-mono text-sm text-mist">Page {current}</span>
        <PageLink page={current + 1} query={query} disabled={registrations.length < 25}>
          Next
        </PageLink>
      </nav>
    </section>
  );
}

function PageLink({
  page,
  query,
  disabled,
  children,
}: {
  readonly page: number;
  readonly query: string;
  readonly disabled: boolean;
  readonly children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-pill border-2 border-white/10/40 px-5 py-2 text-sm text-mist/40">
        {children}
      </span>
    );
  }

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));

  return (
    <Link
      href={`/admin?${params.toString()}`}
      className="rounded-pill border-2 border-white/10 px-5 py-2 text-sm font-bold text-paper hover:bg-dusk/40"
    >
      {children}
    </Link>
  );
}