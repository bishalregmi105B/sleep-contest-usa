import { NextResponse } from 'next/server';
import { adminEnabled } from '@/lib/env';
import {
  assertSameOrigin,
  clearLoginFailures,
  createSession,
  passwordMatches,
  recordLoginFailure,
} from '@/lib/auth';
import { clientIp, hashIp } from '@/lib/privacy';
import { fallbackKV, withKV } from '@/lib/kv';
import { withRouteLogging } from '@/lib/logger';
import { adminLoginSchema } from '@/lib/validators';


/**
 * POST /api/admin/login
 *
 * Scrypt verification, plus a Redis-backed lockout after five failures.
 *
 * The lockout is shared across instances on purpose. The previous implementation
 * rate limited per process, which on a multi-instance deploy granted N attempts
 * per instance — at five attempts each, a ten-instance deployment allowed fifty
 * guesses per window.
 */
export async function POST(request: Request) {
  return withRouteLogging(request, 'POST /api/admin/login', async (ctx) => {
    if (!adminEnabled) {
      return NextResponse.json(
        { message: 'Admin access is not configured. Set ADMIN_PASSWORD_HASH and SESSION_SECRET.' },
        { status: 501 },
      );
    }

    const crossOrigin = assertSameOrigin(request);
    if (crossOrigin) return crossOrigin;

    const ip = clientIp(request);
    const key = `rl:admin:ip:${ip}`;

    const allowed = await withKV(
      (kv) => kv.hit(key, 10, 900),
      () => fallbackKV.hit(key, 10, 900),
    );
    if (!allowed) {
      ctx.log('warn', 'admin login rate limited');
      return NextResponse.json(
        { message: 'Too many attempts. Try again in fifteen minutes.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }

    const parsed = adminLoginSchema.safeParse(body);

    // scrypt runs even for a malformed body, so a wrong-password request and a
    // malformed request take the same time. Otherwise the response time is an
    // oracle for "was the password right".
    const ok = await passwordMatches(parsed.success ? parsed.data.password : '');
    if (!parsed.success || !ok) {
      const locked = await recordLoginFailure(hashIp(ip));
      ctx.log('warn', 'admin login failed', { locked });
      // One message for a wrong password and a malformed body, so the response
      // does not say which part was wrong.
      return NextResponse.json(
        { message: locked ? 'Too many attempts. Try again in fifteen minutes.' : 'Not authorised.' },
        { status: 401 },
      );
    }

    await clearLoginFailures(hashIp(ip));
    await createSession();
    return NextResponse.json({ ok: true });
  });
}
