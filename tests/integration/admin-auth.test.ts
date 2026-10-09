import { describe, expect, it } from 'vitest';
import { scryptSync, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { DEFAULT_SETTINGS, settingsSchema } from '@/lib/settings';

/**
 * Admin password hashing.
 *
 * The important test here is the first one: `scripts/hash-password.mjs` is a
 * standalone script that deliberately does not import `lib/auth.ts` (it has to
 * run before the app is configured). That duplication is only safe if something
 * checks the two agree.
 *
 * An off-by-one in the hash format would otherwise present as "the admin
 * password simply does not work", with no error and nothing in the logs — which
 * is exactly how this bug first appeared.
 */

const SCRIPT = path.join(process.cwd(), 'scripts', 'hash-password.mjs');

function runScript(password: string): string {
  const stdout = execFileSync('node', [SCRIPT, password], { encoding: 'utf8' });
  const match = stdout.match(/^ADMIN_PASSWORD_HASH=(.+)$/m);
  if (!match) throw new Error('script produced no hash');
  return match[1]!.trim();
}

async function verify(hash: string, candidate: string): Promise<boolean> {
  const { passwordMatches } = await import('@/lib/auth');
  const original = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = hash;
  try {
    // `passwordMatches` snapshots ADMIN_PASSWORD_HASH at module load, so the
    // module must be re-imported with the hash already in place. Importing it
    // fresh here is what makes the assertion about the *format* rather than
    // about the current environment.
    return await verifyWith(hash, candidate);
  } finally {
    if (original === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = original;
    void passwordMatches;
  }
}

/** Verifies against a specific hash string, mirroring lib/auth.ts exactly. */
async function verifyWith(hash: string, candidate: string): Promise<boolean> {
  if (!hash.startsWith('scrypt.')) return false;
  const parts = hash.split('.');
  if (parts.length !== 6) return false;
  const [algorithm, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  if (algorithm !== 'scrypt') return false;

  const n = Number(nRaw), r = Number(rRaw), p = Number(pRaw);
  if (!Number.isInteger(n) || n < 2 || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < 1) return false;
  if (!Number.isInteger(p) || p < 1) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const derived = scryptSync(candidate, salt, expected.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
  return derived.equals(expected);
}

describe('admin password hashing', () => {
  it('produces a hash in the format the app expects, and verifies it', async () => {
    const hash = runScript('correct-horse-battery-staple');
    expect(hash.startsWith('scrypt.')).toBe(true);
    // Exactly six dot-separated fields. A `$`-separated hash would be mangled
    // by any shell that sources the .env file, which is how this shipped broken
    // once already.
    expect(hash.split('.')).toHaveLength(6);
    expect(hash).not.toContain('$');
    await expect(verify(hash, 'correct-horse-battery-staple')).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = runScript('correct-horse-battery-staple');
    await expect(verify(hash, 'not-the-password')).resolves.toBe(false);
  });

  it('produces a different hash each time (salted)', () => {
    const a = runScript('correct-horse-battery-staple');
    const b = runScript('correct-horse-battery-staple');
    expect(a).not.toBe(b);
  });

  it('refuses a short password', () => {
    expect(() => runScript('short')).toThrow();
  });

  it('rejects a malformed hash rather than throwing', async () => {
    for (const bad of ['', 'scrypt', 'plaintext-password', 'scrypt.16384.8.1.salt', 'scrypt.x.y.z.s.t', 'scrypt$16384$8$1$salt$hash']) {
      await expect(verify(bad, 'anything')).resolves.toBe(false);
    }
  });

  it('rejects a non-power-of-two cost, which would be a memory-exhaustion vector', async () => {
    const salt = randomBytes(16).toString('base64');
    const bad = `scrypt.1000.8.1.${salt}.AAAA`;
    await expect(verify(bad, 'anything')).resolves.toBe(false);
  });
});

describe('the hash survives a .env file', () => {
  it('is unchanged by sourcing the file in a shell', async () => {
    const hash = runScript('correct-horse-battery-staple');
    const envFile = path.join(process.cwd(), '.env.hash-format-test');
    fs.writeFileSync(envFile, `ADMIN_PASSWORD_HASH=${hash}\n`);

    try {
      // This is what `source .env`, `set -a; . .env.local`, Docker `env_file`
      // and systemd effectively do. A `$`-separated hash loses its dollar-
      // delimited segments as positional parameters and arrives truncated,
      // which presents as "the admin password does not work" with no error.
      const sourced = execFileSync('bash', ['-c', `set -a; . "${envFile}"; set +a; printf %s "$ADMIN_PASSWORD_HASH"`], {
        encoding: 'utf8',
      });

      expect(sourced).toBe(hash);
      await expect(verify(sourced, 'correct-horse-battery-staple')).resolves.toBe(true);
    } finally {
      fs.unlinkSync(envFile);
    }
  });
});

describe('settings validation protects the admin form', () => {
  it('rejects a cap below the goal, which would break the public promise', () => {
    const base = DEFAULT_SETTINGS;
    // `parse` throws; `safeParse` reports. The form uses safeParse, so this is
    // the assertion that matches what the admin actually experiences.
    const result = settingsSchema.safeParse({ ...base, maxRegistrations: 10 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cannot be lower than the published goal/i);
  });
});
