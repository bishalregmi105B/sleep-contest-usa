import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, gwrGuard, settingsSchema, toPublic } from '@/lib/settings';
import { normalizeEmail, normalizeMobile, hashEmail, hashIp } from '@/lib/privacy';

describe('settingsSchema', () => {
  const valid = { ...DEFAULT_SETTINGS };

  it('accepts the defaults', () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects milestones that do not increase', () => {
    const result = settingsSchema.safeParse({ ...valid, milestones: [500, 500, 1_000] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/increasing order/i);
  });

  it('rejects a ladder that does not end at the goal', () => {
    const result = settingsSchema.safeParse({ ...valid, goal: 300_000, milestones: [500, 1_000] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/must equal the goal/i);
  });

  it('rejects a cap below the published goal', () => {
    const result = settingsSchema.safeParse({ ...valid, maxRegistrations: 100, goal: 200_000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cannot be lower than the published goal/i);
  });

  it('rejects a negative threshold', () => {
    expect(settingsSchema.safeParse({ ...valid, counterMinPublic: -1 }).success).toBe(false);
  });

  it('accepts a cap the client raised above the goal', () => {
    const result = settingsSchema.safeParse({ ...valid, maxRegistrations: 500_000 });
    expect(result.success).toBe(true);
  });
});

describe('gwrGuard', () => {
  it('permits the badge being switched off', () => {
    expect(gwrGuard({ gwrEnabled: false, gwrApprovalRef: '', gwrApprovedAt: null })).toBeNull();
  });

  it('refuses to enable without an approval reference', () => {
    const problem = gwrGuard({ gwrEnabled: true, gwrApprovalRef: '   ', gwrApprovedAt: null });
    expect(problem).toMatch(/approval reference/i);
  });

  it('refuses to enable without an approval date', () => {
    expect(gwrGuard({ gwrEnabled: true, gwrApprovalRef: 'GWR-123', gwrApprovedAt: null })).toMatch(/date/i);
  });

  it('refuses a nonsense date', () => {
    expect(gwrGuard({ gwrEnabled: true, gwrApprovalRef: 'GWR-123', gwrApprovedAt: 'soon' })).toMatch(/valid date/i);
  });

  it('permits enabling once a reference and date are both present', () => {
    expect(
      gwrGuard({ gwrEnabled: true, gwrApprovalRef: 'GWR-2026-114', gwrApprovedAt: '2026-01-15' }),
    ).toBeNull();
  });
});

describe('toPublic', () => {
  it('forces the badge off when the guard is not satisfied', () => {
    const published = toPublic({ ...DEFAULT_SETTINGS, gwrEnabled: true, gwrApprovalRef: '' });
    expect(published.gwrEnabled).toBe(false);
  });

  it('publishes it once the guard passes', () => {
    const published = toPublic({
      ...DEFAULT_SETTINGS,
      gwrEnabled: true,
      gwrApprovalRef: 'GWR-2026-114',
      gwrApprovedAt: '2026-01-15',
    });
    expect(published.gwrEnabled).toBe(true);
  });

  it('never publishes the approval reference itself', () => {
    const published = toPublic({ ...DEFAULT_SETTINGS, gwrApprovalRef: 'GWR-SECRET-REF' }) as Record<string, unknown>;
    expect(published).not.toHaveProperty('gwrApprovalRef');
  });
});

describe('privacy helpers', () => {
  it('normalises case and surrounding whitespace', () => {
    expect(normalizeEmail('  Ada.Lovelace@Example.COM ')).toBe('ada.lovelace@example.com');
  });

  it('keeps plus-tags distinct rather than merging mailboxes', () => {
    // Merging these would let one person occupy another's slot, or block a
    // legitimate entrant. Under-normalising risks a duplicate, which is the
    // safer failure.
    expect(normalizeEmail('a+contest@example.com')).not.toBe(normalizeEmail('a+other@example.com'));
  });

  it('normalises a 10-digit number to E.164', () => {
    expect(normalizeMobile('512-555-0134')).toBe('15125550134');
  });

  it('preserves an explicit country code', () => {
    expect(normalizeMobile('+44 20 7946 0958')).toBe('442079460958');
  });

  it('hashes deterministically and does not contain the input', () => {
    const hash = hashEmail('ada@example.com');
    expect(hash).toBe(hashEmail('ADA@EXAMPLE.COM'));
    expect(hash).not.toContain('ada');
    expect(hash).toHaveLength(32);
  });

  it('hashes IPs without storing them', () => {
    const hash = hashIp('203.0.113.7');
    expect(hash).toHaveLength(32);
    expect(hash).not.toContain('203.0.113.7');
    expect(hashIp('203.0.113.7')).toBe(hash);
    expect(hashIp('203.0.113.8')).not.toBe(hash);
  });
});
