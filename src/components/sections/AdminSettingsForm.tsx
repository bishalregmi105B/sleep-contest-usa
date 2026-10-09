'use client';

import { useState } from 'react';
import type { Settings } from '@/lib/settings';
import { getProgress } from '@/lib/progress';

/**
 * Admin settings form.
 *
 * This is the interface the client asked for: "max registration should be
 * changeable from admin". It writes the same settings document the API accepts,
 * so everything the client can change here is also changeable by an integration
 * later.
 *
 * ## Live preview
 *
 * The public progress display is rendered from the same `getProgress` function
 * the site uses, with the values currently in the form. That is deliberate: a
 * preview built from different logic is a preview that lies, and the client
 * would find out by looking at the real site afterwards.
 *
 * ## What is deliberately absent
 *
 * There is no control that adjusts a displayed number. The count on the site is
 * the paid, non-internal count from the database and nothing else. If a control
 * like that were ever added, `scripts/check-integrity.mjs` fails the build.
 */

const FIELD = 'w-full rounded-lg border border-white/15 bg-ink/60 px-3 py-2 text-paper placeholder:text-mist/60 focus:border-signal focus:outline-none';
const LABEL = 'block font-mono text-xs uppercase tracking-[0.14em] text-mist font-semibold';

export function AdminSettingsForm({
  initial,
  currentCount,
}: {
  readonly initial: Settings;
  /** The real paid count right now, so the preview is not an empty shell. */
  readonly currentCount: number;
}) {
  const [form, setForm] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = getProgress({
    paidCount: currentCount,
    milestones: form.milestones,
    goal: form.goal,
    counterMinPublic: form.counterMinPublic,
  });

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setErrors({});
  }

  function setMilestones(text: string) {
    const parsed = text
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    set('milestones', parsed.length > 0 ? parsed : [form.goal]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as { settings?: Settings; errors?: Record<string, string>; message?: string };

      if (!response.ok) {
        setErrors(body.errors ?? {});
        setMessage({ kind: 'error', text: body.message ?? 'Those settings could not be saved.' });
        return;
      }

      // Adopt whatever the server actually stored, not what was submitted: the
      // server may have coerced a value, and a form that shows something
      // different from what is live is worse than a rejected save.
      if (body.settings) setForm(body.settings);
      setMessage({ kind: 'ok', text: 'Saved. The public site reflects this within 15 seconds.' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not reach the server. Nothing was changed.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-8" data-testid="admin-settings-form">
      {message ? (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.kind === 'ok'
              ? 'border-mint/40 bg-mint/10 text-mint'
              : 'border-tungsten/50 bg-tungsten/10 text-paper'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {/* ---- registration ------------------------------------------------- */}
      <fieldset className="flex flex-col gap-4">
        <legend className={LABEL}>Registration</legend>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.registrationOpen}
            onChange={(e) => set('registrationOpen', e.target.checked)}
            className="h-4 w-4 accent-signal"
          />
          <span className="text-sm text-paper">Registration is open</span>
        </label>
        {!form.registrationOpen ? (
          <p className="rounded-lg border border-tungsten/40 bg-tungsten/10 px-3 py-2 text-sm text-paper">
            The form is closed and the API returns 403. The waitlist stays open, so people can still leave an
            email.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="maxRegistrations" className={LABEL}>
              Hard cap
            </label>
            <input
              id="maxRegistrations"
              type="number"
              min={1}
              value={form.maxRegistrations}
              onChange={(e) => set('maxRegistrations', Number(e.target.value))}
              className={FIELD}
            />
            {errors.maxRegistrations ? <FieldError>{errors.maxRegistrations}</FieldError> : null}
            <p className="pt-1 text-xs text-mist">
              Enforced atomically. The site refuses registration past this number and offers a waitlist.
            </p>
          </div>

          <div>
            <label htmlFor="goal" className={LABEL}>
              Final goal
            </label>
            <input
              id="goal"
              type="number"
              min={1}
              value={form.goal}
              onChange={(e) => set('goal', Number(e.target.value))}
              className={FIELD}
            />
            {errors.goal ? <FieldError>{errors.goal}</FieldError> : null}
          </div>
        </div>

        <div>
          <label htmlFor="milestones" className={LABEL}>
            Milestone ladder
          </label>
          <input
            id="milestones"
            type="text"
            defaultValue={form.milestones.join(', ')}
            onBlur={(e) => setMilestones(e.target.value)}
            className={FIELD}
          />
          {errors.milestones ? <FieldError>{errors.milestones}</FieldError> : null}
          <p className="pt-1 text-xs text-mist">
            Comma-separated, increasing, and the last one must equal the goal.
          </p>
        </div>

        <div>
          <label htmlFor="counterMinPublic" className={LABEL}>
            Show a number only above
          </label>
          <input
            id="counterMinPublic"
            type="number"
            min={0}
            value={form.counterMinPublic}
            onChange={(e) => set('counterMinPublic', Number(e.target.value))}
            className={FIELD}
          />
          <p className="pt-1 text-xs text-mist">
            Set to 0, which is the default, the real count is always shown including zero. Raise it only if the
            numeral at zero is a problem for the campaign.
          </p>
        </div>
      </fieldset>

      {/* ---- preview ------------------------------------------------------ */}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <legend className={LABEL}>What the public will see</legend>
        <Preview progress={preview} currentCount={currentCount} />
      </fieldset>

      {/* ---- sections ----------------------------------------------------- */}
      <fieldset className="flex flex-col gap-4">
        <legend className={LABEL}>Sections</legend>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.showWorldSection}
            onChange={(e) => set('showWorldSection', e.target.checked)}
            className="h-4 w-4 accent-signal"
          />
          <span className="text-sm text-paper">Show &ldquo;sleep contests around the world&rdquo;</span>
        </label>
      </fieldset>

      {/* ---- record attempt ----------------------------------------------- */}
      <fieldset className="flex flex-col gap-4">
        <legend className={LABEL}>Record attempt</legend>
        <p className="text-xs text-mist">
          On by default. With this off, no mark and no related wording appears anywhere on the site. The badge
          always says &ldquo;Official Attempt&rdquo; and never claims a record has been set.
        </p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.gwrEnabled}
            onChange={(e) => set('gwrEnabled', e.target.checked)}
            className="h-4 w-4 accent-signal"
          />
          <span className="text-sm text-paper">Show the badge</span>
        </label>
        {errors.gwrEnabled ? <FieldError>{errors.gwrEnabled}</FieldError> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gwrApprovalRef" className={LABEL}>
              Approval reference (optional)
            </label>
            <input
              id="gwrApprovalRef"
              type="text"
              value={form.gwrApprovalRef}
              onChange={(e) => set('gwrApprovalRef', e.target.value)}
              className={FIELD}
              placeholder="Reference from their written approval"
            />
          </div>
          <div>
            <label htmlFor="gwrApprovedAt" className={LABEL}>
              Approval date
            </label>
            <input
              id="gwrApprovedAt"
              type="date"
              value={form.gwrApprovedAt ?? ''}
              onChange={(e) => set('gwrApprovedAt', e.target.value || null)}
              className={FIELD}
            />
          </div>
        </div>
      </fieldset>

      {/* ---- content ------------------------------------------------------ */}
      <fieldset className="flex flex-col gap-4">
        <legend className={LABEL}>Content</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['contactEmail', 'Contact email'],
              ['deadline', 'Announcement line'],
              ['sponsor', 'Sponsor'],
              ['instagram', 'Instagram'],
              ['tiktok', 'TikTok'],
              ['x', 'X'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={key} className={LABEL}>
                {label}
              </label>
              <input
                id={key}
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className={FIELD}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-signal px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-ink disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}

/** Preview of the public display, rendered from the same rules the site uses. */
function Preview({
  progress,
  currentCount,
}: {
  readonly progress: ReturnType<typeof getProgress>;
  readonly currentCount: number;
}) {
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {progress.kind === 'hidden' ? (
        <>
          <p className="text-lg text-paper">{progress.copy}</p>
          <p className="text-sm text-mist">
            {currentCount.toLocaleString('en-US')} paid so far, below the threshold. The numeral appears once
            the real count reaches it.
          </p>
        </>
      ) : progress.kind === 'complete' ? (
        <p className="text-lg text-paper">
          Goal reached — the real count ({currentCount.toLocaleString('en-US')}) with a &ldquo;Goal
          reached&rdquo; line.
        </p>
      ) : (
        <>
          <p className="font-mono text-3xl font-bold tabular-nums text-paper">
            {progress.count.toLocaleString('en-US')} / {progress.currentMilestone.toLocaleString('en-US')}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-mist">{progress.label}</p>
          <p className="text-sm text-mist">{progress.overall}</p>
        </>
      )}
      <p className="text-sm font-semibold text-paper">{progress.goalLine}</p>
    </div>
  );
}

function FieldError({ children }: { readonly children: React.ReactNode }) {
  return (
    <p role="alert" className="pt-1 text-xs text-tungsten">
      {children}
    </p>
  );
}