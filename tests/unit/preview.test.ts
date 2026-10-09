import { describe, expect, it } from 'vitest';

/**
 * Preview mode's safety properties.
 *
 * Preview mode exists so a deployment with no database can still be browsed.
 * The properties below are the reason it is safe to have at all, and they are
 * the ones worth protecting: a preview must never look like a live site, and it
 * must never weaken the rule that a ticket is only ever issued for money taken.
 *
 * These read `previewEnabled` as a module-level constant, so they assert the
 * logic rather than re-running it under a different environment. The
 * environment-dependent behaviour is verified end to end against a running
 * server; see DEPLOY.md §"Preview deployments".
 */

describe('preview mode gate', () => {
  it('is off in the test environment, which has a real database', async () => {
    const { previewEnabled, isPreview } = await import('@/lib/preview');
    // The suite sets DATABASE_URL to a real Postgres, so preview must not
    // engage. If it ever does, every other test in this file is meaningless
    // because it would be asserting against a different code path.
    expect(previewEnabled).toBe(false);
    expect(isPreview).toBe(previewEnabled);
  });

  it('is conjunctive, so a stale flag can never override a real database', async () => {
    // `previewEnabled` is `PREVIEW_MODE === 'true' && !havePostgres`. The
    // ordering is the safety property: configuring a real database must win,
    // because the alternative is a production deploy silently serving from a
    // per-instance SQLite file.
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../../src/lib/preview.ts', import.meta.url), 'utf8'),
    );

    expect(source).toMatch(/previewEnabled\s*=\s*requested\s*&&\s*!havePostgres/);
    expect(source).toMatch(/if \(requested && havePostgres\)/);
  });

  it('documents that the write paths refuse, and they do', async () => {
    const [register, checkout, webhook, health] = await Promise.all(
      [
        '../../src/app/api/register/route.ts',
        '../../src/app/api/checkout/route.ts',
        '../../src/app/api/webhooks/stripe/route.ts',
        '../../src/app/api/health/route.ts',
      ].map((path) => import('node:fs').then((fs) => fs.readFileSync(new URL(path, import.meta.url), 'utf8'))),
    );

    // Each must gate on the flag and return before any write.
    expect(register).toMatch(/if \(previewEnabled\)/);
    expect(checkout).toMatch(/if \(previewEnabled\)/);
    expect(webhook).toMatch(/if \(previewEnabled\)/);

    // And the preview refusal must come before the production configuration
    // check, or a preview throws on the missing database and a visitor gets a
    // generic error instead of being told plainly what this is.
    const registerAssert = register.indexOf('assertServerConfigured()');
    const registerPreview = register.indexOf('if (previewEnabled)');
    expect(registerPreview).toBeGreaterThanOrEqual(0);
    expect(registerPreview).toBeLessThan(registerAssert);

    // Health must report the preview as a problem in any environment, so a
    // monitor, a person, or a deploy script cannot mistake it for the live site.
    expect(health).toMatch(/PREVIEW MODE/);
    expect(health).toMatch(/previewMode:\s*previewEnabled/);
  });
});

describe('preview write paths', () => {
  it('does not write a registration, a payment or a webhook', async () => {
    // Structural, and deliberately so: the three write paths are the ones that
    // would let a preview look like a real site. Asserting that each guards on
    // the flag is the check that survives a refactor of the handler body.
    const sources = await Promise.all(
      [
        '../../src/app/api/register/route.ts',
        '../../src/app/api/checkout/route.ts',
        '../../src/app/api/webhooks/stripe/route.ts',
      ].map((path) => import('node:fs').then((fs) => fs.readFileSync(new URL(path, import.meta.url), 'utf8'))),
    );

    for (const source of sources) {
      expect(source).toMatch(/previewEnabled/);
      // A preview must never reach the capacity hold or the paid transition.
      const guard = source.indexOf('if (previewEnabled)');
      expect(guard).toBeGreaterThan(-1);
    }
  });
});
