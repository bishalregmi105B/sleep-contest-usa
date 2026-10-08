import { NextResponse } from 'next/server';
import { adminEnabled } from '@/lib/env';
import { createSession, passwordMatches } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { adminLoginSchema } from '@/lib/validators';


/**
 * POST /api/admin/login
 *
 * Rate limited per IP so the password cannot be guessed by repetition.
 */
export async function POST(request: Request) {
  if (!adminEnabled) {
    return NextResponse.json(
      { message: 'Admin access is not configured. Set ADMIN_PASSWORD and SESSION_SECRET.' },
      { status: 501 },
    );
  }

  if (!rateLimit(`admin:${clientIp(request)}`, { perMinute: 5, burst: 5 })) {
    return NextResponse.json({ message: 'Too many attempts.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success || !passwordMatches(parsed.data.password)) {
    // One message for both a wrong password and a malformed body, so the
    // response does not tell an attacker which part was wrong.
    return NextResponse.json({ message: 'Not authorised.' }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}