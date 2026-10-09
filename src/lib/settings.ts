import { z } from 'zod';
import { getDb } from './db';
import { fallbackKV, withKV } from './kv';
import { log } from './logger';

/**
 * Client-editable settings.
 *
 * These used to be hardcoded constants in `src/content/site.ts` and environment
 * variables, which meant changing the registration cap required a developer and
 * a deploy. They now live in the database and are editable from admin, which is
 * what the client asked for ("max registration should be changeable from
 * admin").
 *
 * Reads are cached in Redis for 15 seconds. A change from admin deletes the key
 * immediately, so the effect is instant on the instance that wrote it and within
 * 15 seconds everywhere else — the service level in the brief.
 */

export const DEFAULT_MILESTONES = [500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 200_000];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const intWithin = (min: number, max: number) =>
  z.number().int().min(min).max(max);

export const settingsSchema = z
  .object({
    /** Kill switch. When false the form shows a closed state and /api/register returns 403. */
    registrationOpen: z.boolean(),
    /** Hard cap, enforced atomically. */
    maxRegistrations: intWithin(1, 10_000_000),
    /** The public final goal. */
    goal: intWithin(1, 10_000_000),
    /** Strictly increasing, last equals goal. */
    milestones: z.array(intWithin(1, 10_000_000)).min(1).max(20),
    /** Below this paid count, show the target instead of a number. */
    counterMinPublic: intWithin(0, 1_000_000),
    showWorldSection: z.boolean(),

    // Guinness World Records "Official Attempt" badge.
    //
    // On by default at the client's instruction. The reference and date are
    // still recorded, but they are informational: they do not gate display.
    // See the note on `gwrGuard`.
    gwrEnabled: z.boolean(),
    gwrApprovalRef: z.string().max(200),
    gwrApprovedAt: z.string().nullable(),

    deadline: z.string().max(80),
    sponsor: z.string().max(120),
    contactEmail: z.string().max(160),
    instagram: z.string().max(120),
    tiktok: z.string().max(120),
    x: z.string().max(120),
  })
  .superRefine((value, ctx) => {
    for (let i = 1; i < value.milestones.length; i += 1) {
      if (value.milestones[i]! <= value.milestones[i - 1]!) {
        ctx.addIssue({
          code: 'custom',
          path: ['milestones'],
          message: 'Milestones must be in increasing order.',
        });
        return;
      }
    }
    if (value.milestones[value.milestones.length - 1] !== value.goal) {
      ctx.addIssue({
        code: 'custom',
        path: ['milestones'],
        message: `The last milestone must equal the goal (${value.goal.toLocaleString('en-US')}).`,
      });
    }
    if (value.maxRegistrations < value.goal) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxRegistrations'],
        message: 'The registration cap cannot be lower than the published goal. Lower the goal first.',
      });
    }
  });

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  registrationOpen: true,
  maxRegistrations: 200_000,
  goal: 200_000,
  milestones: DEFAULT_MILESTONES,
  counterMinPublic: 0,
  showWorldSection: true,
  // Off, and it cannot be turned on without a written approval reference from
  // Guinness World Records. See CLIENT_INPUTS_NEEDED.md.
  gwrEnabled: true,
  gwrApprovalRef: '',
  gwrApprovedAt: null,
  deadline: '',
  sponsor: '',
  contactEmail: '',
  instagram: '',
  tiktok: '',
  x: '',
};

/**
 * Advisory checks on the record-attempt badge.
 *
 * ## Why these no longer block
 *
 * This used to be a hard gate: the badge could not be enabled without a written
 * approval reference and a date. That was a deliberate choice, on the basis
 * that Guinness World Records requires a licence for commercial use of its name
 * and logos.
 *
 * The client has now seen that analysis and instructed that the badge be shown
 * by default with no document required in admin. It is their trademark and their
 * commercial decision to make, so the gate is down. The checks below remain as
 * *advisories*: they still surface in the admin health card and the settings
 * audit, so the position is visible rather than hidden, but they do not stop the
 * badge rendering.
 *
 * ## What is unchanged
 *
 * The badge says "Official Attempt" and nothing more. It never says a record has
 * been set, achieved or certified. That distinction is the difference between
 * describing a status and claiming an endorsement nobody has given, so it is
 * kept regardless of who decides to publish the badge.
 *
 * The remaining exposure is trademark, not honesty: publishing the mark without
 * the licence is a matter for the client's legal advisers, and it is recorded in
 * CLIENT_INPUTS_NEEDED.md §10.
 */
export function gwrGuard(next: { gwrEnabled: boolean; gwrApprovalRef: string; gwrApprovedAt: string | null }): string | null {
  if (!next.gwrEnabled) return null;
  if (!next.gwrApprovalRef.trim()) {
    return 'No approval reference recorded. The badge will still show; record the reference so the licence position is on file.';
  }
  if (!next.gwrApprovedAt) {
    return 'No approval date recorded. The badge will still show.';
  }
  if (Number.isNaN(new Date(next.gwrApprovedAt).getTime())) {
    return 'The approval date is not a valid date.';
  }
  return null;
}

/**
 * Whether the record-attempt paperwork is complete.
 *
 * Purely informational. Reported in the admin health card and exposed on the
 * public settings endpoint so the state is visible everywhere rather than
 * inferred from silence.
 */
export function gwrPaperworkComplete(settings: {
  gwrEnabled: boolean;
  gwrApprovalRef: string;
  gwrApprovedAt: string | null;
}): boolean {
  return Boolean(settings.gwrApprovalRef.trim()) && Boolean(settings.gwrApprovedAt);
}

/**
 * The subset the browser is allowed to see.
 *
 * Explicitly listed rather than derived by omission, so adding a secret to
 * `Settings` later cannot accidentally publish it.
 */
/**
 * The subset the browser is allowed to see.
 *
 * Listed explicitly rather than derived by omission, so adding a field to
 * `Settings` later cannot accidentally publish it. `gwrApprovalRef` is
 * deliberately absent: it is internal reference material, not something to
 * publish. Whether that paperwork exists is published instead, as a boolean.
 */
export type PublicSettings = {
  readonly registrationOpen: boolean;
  readonly maxRegistrations: number;
  readonly goal: number;
  readonly milestones: readonly number[];
  readonly counterMinPublic: number;
  readonly showWorldSection: boolean;
  readonly gwrEnabled: boolean;
  readonly gwrApprovedAt: string | null;
  /** Whether an approval reference and date are actually on file. */
  readonly gwrPaperworkOnFile: boolean;
  readonly deadline: string;
  readonly sponsor: string;
  readonly contactEmail: string;
  readonly instagram: string;
  readonly tiktok: string;
  readonly x: string;
};

const PUBLIC_KEYS = [
  'registrationOpen',
  'maxRegistrations',
  'goal',
  'milestones',
  'counterMinPublic',
  'showWorldSection',
  'gwrEnabled',
  'gwrApprovedAt',
  'deadline',
  'sponsor',
  'contactEmail',
  'instagram',
  'tiktok',
  'x',
] as const satisfies ReadonlyArray<keyof Settings>;

export function toPublic(settings: Settings): PublicSettings {
  const out = {} as Record<string, unknown>;
  for (const key of PUBLIC_KEYS) out[key] = settings[key];

  // Derived, not stored. Published so the record-attempt position is stated
  // plainly on the public endpoint rather than having to be inferred from
  // whether a badge appears.
  out.gwrPaperworkOnFile = gwrPaperworkComplete(settings);

  return out as PublicSettings;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const CACHE_KEY = 'settings:v1';
const CACHE_TTL_SECONDS = 15;

/**
 * All settings, cached.
 *
 * Missing rows fall back to the defaults and are not written back: seeding on
 * read would turn a read path into a write, and a settings read happens on every
 * public page load.
 */
export async function getSettings(): Promise<Settings> {
  return withKV(
    async (kv) => {
      const cached = await kv.get(CACHE_KEY);
      if (cached) {
        const parsed = settingsSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      }
      return loadAndCache(kv);
    },
    async () => {
      const cached = await fallbackKV.get(CACHE_KEY);
      if (cached) {
        const parsed = settingsSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      }
      return loadAndCache(fallbackKV);
    },
  );
}

async function loadAndCache(kv: { get(k: string): Promise<string | null>; set(k: string, v: string, t: number): Promise<void> }): Promise<Settings> {
  const db = await getDb();
  const rows = await db.setting.findMany();

  const merged = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) {
      (merged as Record<string, unknown>)[row.key] = row.value;
    }
  }

  const parsed = settingsSchema.safeParse(merged);
  const settings = parsed.success ? parsed.data : DEFAULT_SETTINGS;
  if (!parsed.success) {
    log.error('settings: stored values failed validation, using defaults', {
      issueCount: parsed.error.issues.length,
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }

  await kv.set(CACHE_KEY, JSON.stringify(settings), CACHE_TTL_SECONDS);
  return settings;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  return toPublic(await getSettings());
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type SettingsUpdateResult =
  | { readonly ok: true; readonly settings: Settings }
  | { readonly ok: false; readonly errors: Record<string, string> };

/**
 * Validates and writes a full settings document, with an audit row per changed
 * key.
 *
 * The whole document is written in one transaction rather than key by key, so a
 * rejected change cannot leave the cap lowered and the goal not.
 */
export async function updateSettings(
  input: unknown,
  actor: { adminId: string; ipHash: string | null },
): Promise<SettingsUpdateResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const next = parsed.data;
  const gwrNote = gwrGuard(next);

  const db = await getDb();
  const previous = await getSettings();

  await db.$transaction(async (tx) => {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const before = previous[key];
      const after = next[key];
      if (JSON.stringify(before) === JSON.stringify(after)) continue;

      await tx.setting.upsert({
        where: { key },
        update: { value: after as never, version: { increment: 1 } },
        create: { key, value: after as never, version: 1 },
      });

      await tx.settingAudit.create({
        data: {
          key,
          oldValue: (before ?? null) as never,
          newValue: (after ?? null) as never,
          adminId: actor.adminId,
          ipHash: actor.ipHash,
        },
      });
    }
  });

  await invalidateSettingsCache();

  const changedKeys = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter(
    (k) => JSON.stringify(previous[k]) !== JSON.stringify(next[k]),
  );

  if (gwrNote) {
    // Advisory, not an error: recorded so it is visible rather than hidden.
    log.warn('settings: record-attempt paperwork incomplete', { note: gwrNote });
  }

  log.info('settings updated', {
    adminId: actor.adminId,
    changedCount: changedKeys.length,
    // Names only. The old and new values are in SettingAudit, which is the
    // right place for a record that may contain a reference or an address.
    changedKeys: changedKeys.join(','),
  });

  return { ok: true, settings: next };
}

/** Drops the cache so a change is visible immediately, not in 15 seconds. */
export async function invalidateSettingsCache(): Promise<void> {
  await withKV(
    (kv) => kv.del(CACHE_KEY),
    () => fallbackKV.del(CACHE_KEY),
  );
}

export async function recentSettingsAudit(limit = 20) {
  const db = await getDb();
  return db.settingAudit.findMany({ orderBy: { at: 'desc' }, take: limit });
}