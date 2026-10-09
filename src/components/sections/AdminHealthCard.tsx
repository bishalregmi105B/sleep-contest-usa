/**
 * Admin health card.
 *
 * The numbers an operator needs during a spike, in one place, without opening a
 * log stream or remembering a SQL query.
 *
 * The capacity row is the important one: `reserved` versus the cap, and whether
 * the denormalised counter still agrees with the registrations table. Those two
 * drifting apart is the one failure mode that would quietly admit registrations
 * above the cap, and the runbook's first action is to compare them.
 */

import type { Settings } from '@/lib/settings';

type OutboxHealth = {
  pending: number;
  retry: number;
  dead: number;
  oldestPendingAgeHours: number | null;
};

export function AdminHealthCard({
  reserved,
  maxRegistrations,
  paid,
  total,
  waitlist,
  outbox,
  settings,
  gwrNote,
}: {
  readonly reserved: number;
  readonly maxRegistrations: number;
  readonly paid: number;
  readonly total: number;
  readonly waitlist: number;
  readonly outbox: OutboxHealth;
  readonly settings: Settings;
  /** Advisory note about the record-attempt paperwork, if any. */
  readonly gwrNote: string | null;
}) {
  const remaining = Math.max(0, maxRegistrations - reserved);
  const fill = maxRegistrations > 0 ? Math.min(1, reserved / maxRegistrations) : 0;
  const nearFull = fill >= 0.9;

  return (
    <div className="flex flex-col gap-5" data-testid="admin-health">
      {/* ---- capacity ------------------------------------------------------ */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-mist font-semibold">
            Capacity
          </span>
          <span className="font-mono text-xs text-mist">
            {reserved.toLocaleString('en-US')} of {maxRegistrations.toLocaleString('en-US')} held ·{' '}
            {remaining.toLocaleString('en-US')} free
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={reserved}
          aria-valuemin={0}
          aria-valuemax={maxRegistrations}
          aria-label="Capacity held"
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className={`h-full rounded-full ${nearFull ? 'bg-tungsten' : 'bg-mint'}`}
            style={{ width: `${fill * 100}%` }}
          />
        </div>
        {nearFull ? (
          <p className="pt-2 text-xs text-tungsten">
            Nearly full. Registration past the cap returns the waitlist state, not an error — raise the cap from
            Settings below if the demand is still there.
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Paid" value={paid.toLocaleString('en-US')} />
        <Stat label="All rows" value={total.toLocaleString('en-US')} />
        <Stat
          label="Unpaid"
          value={Math.max(0, total - paid).toLocaleString('en-US')}
          hint="Pending plus expired. These hold capacity until the sweeper expires them."
        />
        <Stat label="Waitlist" value={waitlist.toLocaleString('en-US')} />
      </dl>

      <div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-mist font-semibold">Email outbox</span>
        <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-3">
          <Stat label="Pending" value={outbox.pending.toLocaleString('en-US')} />
          <Stat label="Retrying" value={outbox.retry.toLocaleString('en-US')} />
          <Stat
            label="Dead"
            value={outbox.dead.toLocaleString('en-US')}
            tone={outbox.dead > 0 ? 'warn' : 'ok'}
            hint={outbox.dead > 0 ? 'These need a human. See RUNBOOK.md section 5.' : undefined}
          />
        </dl>
        {outbox.oldestPendingAgeHours !== null && outbox.oldestPendingAgeHours > 1 ? (
          <p className="pt-2 text-xs text-tungsten">
            Oldest unsent message is {outbox.oldestPendingAgeHours}h old. The sweeper should be sending these;
            check that CRON_SECRET matches and the cron is reaching the deployment.
          </p>
        ) : null}
      </div>

      {/* ---- configuration state ------------------------------------------
          Stated explicitly rather than inferred from what is or is not on the
          page. The point of this card is that an operator should never have to
          guess why something is hidden. */}
      <div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-mist font-semibold">
          Configuration
        </span>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm">
          <li className="flex flex-wrap items-center gap-2 text-mist">
            <Mark ok={settings.registrationOpen} />
            Registration is {settings.registrationOpen ? 'open' : 'closed'}
          </li>
          <li className="flex flex-wrap items-center gap-2 text-mist">
            <Mark ok={settings.gwrEnabled} />
            Record-attempt badge is {settings.gwrEnabled ? 'on' : 'off'}
            {settings.gwrEnabled ? (
              <span className={gwrNote ? 'text-tungsten' : 'text-mist/70'}>
                &mdash; {gwrNote ? 'paperwork incomplete' : 'paperwork on file'}
              </span>
            ) : null}
          </li>
          <li className="flex flex-wrap items-center gap-2 text-mist">
            <Mark ok={settings.showWorldSection} />
            &ldquo;Sleep contests around the world&rdquo; section is{' '}
            {settings.showWorldSection ? 'shown' : 'hidden'}
          </li>
        </ul>
        {gwrNote ? (
          <p className="pt-2 text-xs text-tungsten">
            {gwrNote} The badge shows either way; recorded here so the position is visible rather than
            inferred.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A small yes/no mark. Not a checkbox: it is not clickable. */
function Mark({ ok }: { readonly ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-mint' : 'bg-tungsten'}`}
    />
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly tone?: 'ok' | 'warn';
}) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.12em] text-mist">{label}</dt>
      <dd
        className={`font-mono text-xl font-bold tabular-nums ${
          tone === 'warn' ? 'text-tungsten' : 'text-paper'
        }`}
      >
        {value}
      </dd>
      {hint ? <p className="pt-1 text-xs text-mist/80">{hint}</p> : null}
    </div>
  );
}