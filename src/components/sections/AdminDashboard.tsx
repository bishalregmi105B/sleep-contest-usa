import type { ReactNode } from 'react';

/**
 * Daily registrations chart.
 *
 * Plain SVG rather than a charting library: it is one sparkline and a table, it
 * must carry no PII, and a dependency that renders to canvas would be both
 * heavier and unreadable to a screen reader.
 *
 * The table underneath is the accessible version of the same data, so the chart
 * is never the only way to read the numbers.
 */
export function DailyChart({
  data,
  caption,
}: {
  readonly data: readonly { readonly date: string; readonly count: number }[];
  readonly caption: string;
}) {
  if (data.length === 0) return null;

  const W = 720;
  const H = 140;
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? W / (data.length - 1) : W;

  // A step chart: daily counts are discrete, and a smooth curve between two
  // integer totals implies a fractional registration that never happened.
  const points = data.map((d, i) => {
    const x = i * step;
    const y = H - (d.count / max) * (H - 12) - 6;
    return { x, y, ...d };
  });

  const line = points
    .map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`))
    .join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const label = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-36 w-full"
        role="img"
        aria-label={`${caption}. Peak ${max} in a day, most recent day ${
          data[data.length - 1]?.count ?? 0
        }.`}
      >
        <defs>
          <linearGradient id="daily-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#35F2B0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#35F2B0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* One gridline at the peak, so the shape has a scale without axes. */}
        <line
          x1="0"
          y1={H - max / max * (H - 12) - 6}
          x2={W}
          y2={H - max / max * (H - 12) - 6}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity="0.2"
          className="text-white"
        />

        <path d={area} fill="url(#daily-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Mark the peak only: a dot on every day would be noise. */}
        {(() => {
          const peak = points.reduce((a, b) => (b.count > a.count ? b : a), points[0]!);
          if (peak.count === 0) return null;
          return (
            <g transform={`translate(${peak.x} ${peak.y})`}>
              <circle r="5" fill="var(--color-mint)" />
              <circle r="9" fill="var(--color-mint)" opacity="0.22" />
            </g>
          );
        })()}
      </svg>

      <figcaption className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-mist/75">
        <span>{label(data[0]!.date)}</span>
        <span>{label(data[data.length - 1]!.date)}</span>
      </figcaption>

      {/* The same numbers, readable without seeing the chart. */}
      <div className="mt-4 max-h-56 overflow-y-auto rounded-[10px] border border-white/10">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-ink">
            <tr>
              <th scope="col" className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist/75">
                Day
              </th>
              <th scope="col" className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-mist/75">
                Paid
              </th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.date} className="border-t border-white/5">
                <td className="px-4 py-2 font-mono text-sm text-mist">{label(d.date)}</td>
                <td className="px-4 py-2 text-right font-mono text-sm tabular-nums text-paper">
                  {d.count.toLocaleString('en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * The funnel, from reservations started to payments completed.
 *
 * Views and clicks are not shown: the analytics provider's numbers belong to
 * the client, not to us, and mixing a server-side count with a vendor's
 * differently-scoped one produces a funnel nobody can reconcile. What is shown
 * is entirely ours and entirely true.
 */
export function Funnel({ total, paid, unpaid }: { readonly total: number; readonly paid: number; readonly unpaid: number }) {
  const completion = total > 0 ? Math.round((paid / total) * 100) : 0;

  const stages: readonly { readonly label: string; readonly value: number }[] = [
    { label: 'Registration started', value: total },
    { label: 'Left before paying', value: unpaid },
    { label: 'Paid, mat reserved', value: paid },
  ];

  return (
    <div>
      <dl className="space-y-4">
        {stages.map((stage) => {
          const width = total > 0 ? Math.max(2, (stage.value / total) * 100) : 2;
          return (
            <div key={stage.label}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-mist">{stage.label}</dt>
                <dd className="font-mono text-sm tabular-nums text-paper">
                  {stage.value.toLocaleString('en-US')}
                </dd>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-mint/70"
                  style={{ width: `${width}%` }}
                  role="presentation"
                />
              </div>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-mist/75">
        {completion}% of registrations completed
      </p>
    </div>
  );
}

/** Referral leaders. Mat numbers and counts only, never names. */
export function ReferralLeaders({
  leaders,
}: {
  readonly leaders: readonly {
    readonly refCode: string;
    readonly matNumber: number | null;
    readonly count: number;
  }[];
}) {
  if (leaders.length === 0) {
    return <p className="text-sm text-mist/75">No referrals yet.</p>;
  }

  const top = leaders[0]?.count ?? 1;

  return (
    <ol className="space-y-3">
      {leaders.map((leader) => (
        <li key={leader.refCode}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-sm text-paper">
              {leader.matNumber === null
                ? leader.refCode
                : `Mat #${leader.matNumber.toLocaleString('en-US')}`}
            </span>
            <span className="font-mono text-sm tabular-nums text-mist">
              {leader.count.toLocaleString('en-US')}
            </span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-tungsten/60"
              style={{ width: `${Math.max(4, (leader.count / top) * 100)}%` }}
              role="presentation"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A labelled panel, used three times on the dashboard. */
export function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="panel p-6">
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist/75">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}