import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { adminEnabled, env, isProduction } from '@/lib/env';
import { fallbackKV, withKV } from '@/lib/kv';
import { log } from '@/lib/logger';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const COOKIE = 'sc_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Admin authentication.
 *
 * ## Passwords
 *
 * The password is stored as a **scrypt** hash, not compared in plaintext. The
 * previous implementation read `ADMIN_PASSWORD` and compared it with
 * `timingSafeEqual`, which meant the plaintext password sat in the environment of
 * every process that served a request; a leaked `.env` or a readable process
 * environment handed over the admin account.
 *
 * scrypt is Node's built-in memory-hard KDF, so there is no native module to
 * compile and no dependency to keep patched. `npm run admin:hash` produces the
 * value that goes in `ADMIN_PASSWORD_HASH`.
 *
 * Format: `scrypt$N$r$p$saltB64$hashB64`
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

/**
 * Verifies a candidate against the stored hash.
 *
 * Returns false rather than throwing for a malformed hash: a corrupt
 * configuration should lock the admin out, not crash the login route with a 500
 * that leaks the hash format.
 */
export async function passwordMatches(candidate: string): Promise<boolean> {
  if (!adminEnabled) return false;
  const stored = env.adminPasswordHash;
  if (!stored.startsWith('scrypt$')) return false;

  const [, n, r, p, saltB64, hashB64] = stored.split('$');
  if (!n || !r || !p || !saltB64 || !hashB64) return false;

  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = await scryptAsync(candidate, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

function secret(): Uint8Array {
  const value = env.sessionSecret;
  if (!value && isProduction) throw new Error('SESSION_SECRET is required in production.');
  return new TextEncoder().encode(value || 'local-development-only-secret');
}

export async function createSession(): Promise<void> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // Strict, not lax. Every admin action is a same-site request; lax would
    // allow the session cookie on a cross-site GET.
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!adminEnabled) return false;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Requires an authenticated admin session, or returns a 401 response.
 *
 * Every mutating admin route goes through this, so a missing check cannot be
 * forgotten.
 */
export async function requireAdmin(): Promise<Response | null> {
  if (!(await isAuthenticated())) {
    return Response.json({ message: 'Not authorised.' }, { status: 401 });
  }
  return null;
}

/**
 * Rejects cross-origin admin mutations.
 *
 * SameSite=strict already stops the cookie riding along cross-site; this is the
 * second layer, and the one that still holds if the cookie policy is ever
 * loosened. A request with no Origin is allowed: the caller already holds the
 * cookie, and operator tooling legitimately omits the header.
 */
export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  const expected = env.siteUrl || new URL(request.url).origin;
  if (origin !== expected) {
    log.warn('admin: rejected cross-origin request');
    return Response.json({ message: 'Not authorised.' }, { status: 403 });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Login lockout
// ---------------------------------------------------------------------------

const LOCKOUT_LIMIT = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes

/**
 * Records a failed login; returns true once the caller is locked out.
 *
 * Shared through Redis so the lockout holds across instances. A per-process
 * counter would grant N attempts per instance, which on a serverless deploy is
 * not a limit at all.
 */
export async function recordLoginFailure(identifier: string): Promise<boolean> {
  const key = `rl:admin:${identifier}`;
  const allowed = await withKV(
    (kv) => kv.hit(key, LOCKOUT_LIMIT, LOCKOUT_WINDOW_SECONDS),
    () => fallbackKV.hit(key, LOCKOUT_LIMIT, LOCKOUT_WINDOW_SECONDS),
  );
  return !allowed;
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  const key = `rl:admin:${identifier}`;
  await withKV((kv) => kv.del(key), () => fallbackKV.del(key));
}