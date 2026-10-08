import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { adminEnabled, env, isProduction } from '@/lib/env';

const COOKIE = 'sc_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secret(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret || 'dev-only-insecure-secret');
}

/**
 * Constant-time string comparison.
 *
 * Length is compared first because timingSafeEqual throws on a mismatch, and
 * the lengths of a password guess are not a secret worth protecting.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function passwordMatches(candidate: string): boolean {
  if (!adminEnabled) return false;
  return safeEqual(candidate, env.adminPassword);
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
    sameSite: 'lax',
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