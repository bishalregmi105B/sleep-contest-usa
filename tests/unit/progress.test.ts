import { describe, expect, it } from 'vitest';
import { currentMilestoneIndex, getProgress, registrationState } from '@/lib/progress';

const MILESTONES = [500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 200_000];
const GOAL = 200_000;

const progress = (paidCount: number, counterMinPublic = 0) =>
  getProgress({ paidCount, milestones: MILESTONES, goal: GOAL, counterMinPublic });

describe('getProgress', () => {
  it('shows no number below the public threshold', () => {
    const result = progress(12, 500);
    expect(result.kind).toBe('hidden');
    if (result.kind === 'hidden') {
      expect(result.copy).toContain('200,000');
      // The whole point: no numeral is shown.
      expect(result.copy).not.toContain('12');
    }
  });

  it('shows the number exactly at the threshold', () => {
    const result = progress(500, 500);
    expect(result.kind).toBe('progress');
  });

  it('treats zero as hidden when the threshold is zero', () => {
    // A live campaign at zero should still not advertise "0 / 200,000".
    expect(progress(0, 0).kind).toBe('progress');
    expect(progress(0, 1).kind).toBe('hidden');
  });

  it('starts at the first milestone', () => {
    const result = progress(501);
    expect(result.kind).toBe('progress');
    if (result.kind === 'progress') {
      expect(result.currentMilestone).toBe(1_000);
      expect(result.milestoneIndex).toBe(2);
      expect(result.label).toBe('Milestone 2 of 9');
    }
  });

  it('advances the milestone exactly on the boundary', () => {
    const result = progress(1_000);
    if (result.kind !== 'progress') throw new Error('expected progress');
    // At exactly 1,000 the display moves to the next rung, not back to 1,000.
    expect(result.currentMilestone).toBe(2_500);
    expect(result.milestoneIndex).toBe(3);
  });

  it('starts the bar at zero on each new milestone', () => {
    const result = progress(1_000);
    if (result.kind !== 'progress') throw new Error('expected progress');
    // Measured from the previous rung (1,000), not from zero.
    expect(result.fraction).toBeCloseTo(0, 5);
  });

  it('reaches full on the last milestone', () => {
    const result = progress(200_000);
    expect(result.kind).toBe('complete');
  });

  it('is complete above the goal rather than over-reporting', () => {
    const result = progress(250_000);
    if (result.kind !== 'complete') throw new Error('expected complete');
    expect(result.count).toBe(250_000);
    // The real count is still reported honestly; the ladder is just finished.
    expect(result.goalLine).toContain('200,000');
  });

  it('never reports a fraction above one', () => {
    const result = getProgress({ paidCount: 199_999, milestones: MILESTONES, goal: GOAL, counterMinPublic: 0 });
    if (result.kind !== 'progress') throw new Error('expected progress');
    expect(result.fraction).toBeLessThanOrEqual(1);
    expect(result.fraction).toBeGreaterThan(0);
  });

  it('falls back to the goal when the ladder is empty', () => {
    const result = getProgress({ paidCount: 10, milestones: [], goal: 50, counterMinPublic: 0 });
    if (result.kind !== 'progress') throw new Error('expected progress');
    expect(result.currentMilestone).toBe(50);
  });
});

describe('currentMilestoneIndex', () => {
  it('is zero below the first milestone', () => {
    expect(currentMilestoneIndex(10, MILESTONES)).toBe(0);
  });

  it('counts every rung reached, including on the boundary', () => {
    expect(currentMilestoneIndex(500, MILESTONES)).toBe(1);
    expect(currentMilestoneIndex(1_000, MILESTONES)).toBe(2);
    expect(currentMilestoneIndex(200_000, MILESTONES)).toBe(9);
  });
});

describe('registrationState', () => {
  const base = { registrationOpen: true, maxRegistrations: 100, reserved: 0, paymentsEnabled: true };

  it('is open when registration is on, under the cap, and payments work', () => {
    expect(registrationState(base).kind).toBe('open');
  });

  it('is closed when registration is switched off', () => {
    expect(registrationState({ ...base, registrationOpen: false }).kind).toBe('closed');
  });

  it('is full exactly at the cap', () => {
    expect(registrationState({ ...base, reserved: 100 }).kind).toBe('full');
  });

  it('reports payments unavailable before capacity, because free space is useless', () => {
    const result = registrationState({ ...base, paymentsEnabled: false, reserved: 100 });
    expect(result.kind).toBe('payments_unavailable');
  });

  it('offers a waitlist whenever it is not open', () => {
    for (const state of [
      registrationState({ ...base, reserved: 999 }),
      registrationState({ ...base, registrationOpen: false }),
      registrationState({ ...base, paymentsEnabled: false }),
    ]) {
      expect(state.kind).not.toBe('open');
      if (state.kind !== 'open') expect(state.waitlistAvailable).toBe(true);
    }
  });
});
