import { NextResponse } from 'next/server';
import { joinWaitlist } from '@/lib/registrations';
import { withRouteLogging } from '@/lib/logger';
import { fallbackKV, withKV } from '@/lib/kv';
import { clientIp } from '@/lib/privacy';


/**
 * POST /api/waitlist
 *
 * Email capture only, for when registration is full or payments are not yet
 * live. No payment is taken and no ticket is promised.
 *
 * Rate limited per IP and validated with the same email rule as the register
 * form, so this cannot be used as a mail bomb.
 */
export async function POST(request: Request) {
  return withRouteLogging(request, 'POST /api/waitlist', async (ctx) => {
    const ip = clientIp(request);
    const key = `rl:waitlist:ip:${ip}`;
    const allowed = await withKV(
      (kv) => kv.hit(key, 3, 60),
      () => fallbackKV.hit(key, 3, 60),
    );
    if (!allowed) {
      return NextResponse.json({ message: 'Too many attempts. Try again in a minute.' }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }

    const email = (body as { email?: unknown })?.email;
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim()) || email.length > 254) {
      return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
    }

    const outcome = await joinWaitlist(email, (body as { source?: string }).source ?? 'waitlist-form');
    ctx.log('info', 'waitlist entry', { outcome });
    return NextResponse.json({ ok: true, alreadyOnList: outcome === 'exists' });
  });
}
