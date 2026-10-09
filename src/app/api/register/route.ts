import { NextResponse } from 'next/server';
import { RESERVE } from '@/content/site';
import { fieldErrors, registrationSchema } from '@/lib/validators';
import { withRouteLogging } from '@/lib/logger';
import { fallbackKV, withKV } from '@/lib/kv';
import { clientIp, hashIp } from '@/lib/privacy';
import {
  REGISTER_RATE_LIMIT,
  createRegistration,
  emailRateKey,
  joinWaitlist,
  lookupIdempotency,
  recordIdempotency,
} from '@/lib/registrations';
import { getSettings } from '@/lib/settings';
import { turnstileEnabled, verifyTurnstile } from '@/lib/turnstile';
import { paymentsEnabled } from '@/lib/env';
import { previewEnabled } from '@/lib/preview';
import { tickSoon } from '@/lib/tick';
import { assertServerConfigured } from '@/lib/env';


/**
 * Request-time by nature, never prerendered.
 *
 * Under `cacheComponents`, a GET handler that reads runtime data or a
 * non-deterministic value is served per request automatically. This one reads
 * `Date.now()` for the cache TTL jitter and reaches Redis, so it is never
 * prerendered. `connection()` is called explicitly anyway: a build-time
 * prerender here would answer every visitor with whatever the counter happened
 * to be when the site was built, which is exactly the bug the previous version
 * of this endpoint had.
 */

/** Bounded body. A registration is well under 1 KB; anything larger is a bot. */
const MAX_BODY_BYTES = 8_192;

/**
 * POST /api/register
 *
 * The hot path. Budget: p95 under 300 ms at 150 rps.
 *
 * Order matters, cheapest check first:
 *
 *   body size -> rate limit (IP) -> validate -> rate limit (email) -> Turnstile
 *   -> idempotency -> settings -> capacity hold -> insert
 *
 * The settings read is cached in Redis for 15 s, so under load it is a cache hit
 * rather than a query.
 *
 * What this route deliberately does **not** do: send email, count registrations,
 * or call any external service. Those are what turn a 5 ms write into a
 * multi-hundred-millisecond one, and what make the endpoint fail when a third
 * party is down.
 */
export async function POST(request: Request) {
  return withRouteLogging(request, 'POST /api/register', async (ctx) => {
    // First thing, before the production configuration check: a preview has no
    // database and no payment provider *by design*, so the configuration check
    // would throw and a visitor would get a generic error instead of being told
    // plainly that this is a preview.
    if (previewEnabled) {
      return NextResponse.json(
        { code: 'preview', message: 'This is a preview deployment. Registration is not open here.' },
        { status: 503, headers: { 'Retry-After': '3600' } },
      );
    }

    // Taking money requires a correctly configured environment. Refusing here
    // is the whole point: a misconfigured deploy must not collect a
    // registration it cannot turn into a ticket.
    assertServerConfigured();

    // ---- body size -------------------------------------------------------
    // Checked on the raw bytes as well as the header, because content-length is
    // client-supplied.
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ message: RESERVE.errors.generic }, { status: 413 });
    }

    const ip = clientIp(request);

    // ---- rate limit: IP --------------------------------------------------
    const ipKey = `rl:register:ip:${ip}`;
    const ipAllowed = await withKV(
      (kv) => kv.hit(ipKey, REGISTER_RATE_LIMIT.perMinute, REGISTER_RATE_LIMIT.windowSeconds),
      () => fallbackKV.hit(ipKey, REGISTER_RATE_LIMIT.perMinute, REGISTER_RATE_LIMIT.windowSeconds),
    );
    if (!ipAllowed) {
      ctx.log('warn', 'register rate limited', { scope: 'ip' });
      return NextResponse.json(
        { message: 'Too many attempts. Wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    // ---- parse and validate ---------------------------------------------
    let raw: string;
    try {
      raw = await request.text();
    } catch {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ message: RESERVE.errors.generic }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
    }

    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: RESERVE.errors.generic, fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const { fullName, email, mobile, dateOfBirth, cityState, ref, company, turnstileToken } = parsed.data;

    // Honeypot after validation, so a bot learns nothing from the response. A
    // real visitor never sees this field. Deliberately does not consume
    // capacity or the per-email rate limit.
    if (company) {
      ctx.log('warn', 'register blocked by honeypot');
      return NextResponse.json({ publicId: 'ok' }, { status: 201 });
    }

    // ---- rate limit: email ----------------------------------------------
    const mailKey = emailRateKey(email);
    const emailAllowed = await withKV(
      (kv) => kv.hit(mailKey, REGISTER_RATE_LIMIT.perMinute, REGISTER_RATE_LIMIT.windowSeconds),
      () => fallbackKV.hit(mailKey, REGISTER_RATE_LIMIT.perMinute, REGISTER_RATE_LIMIT.windowSeconds),
    );
    if (!emailAllowed) {
      ctx.log('warn', 'register rate limited', { scope: 'email' });
      return NextResponse.json(
        { message: 'Too many attempts. Wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    // ---- bot check -------------------------------------------------------
    if (turnstileEnabled) {
      const ok = await verifyTurnstile(turnstileToken ?? '', ip);
      if (!ok) {
        ctx.log('warn', 'turnstile rejected');
        return NextResponse.json({ message: 'Please confirm you are human and try again.' }, { status: 400 });
      }
    }

    // ---- idempotency -----------------------------------------------------
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const previous = await lookupIdempotency('register', idempotencyKey);
      if (previous.replay) {
        return NextResponse.json({ publicId: previous.publicId }, { status: previous.status });
      }
    }

    const settings = await getSettings();

    // ---- kill switch -----------------------------------------------------
    if (!settings.registrationOpen) {
      return NextResponse.json({ message: 'Registration is closed right now.', code: 'closed' }, { status: 403 });
    }

    // ---- payments --------------------------------------------------------
    // Without a working payment provider the site cannot issue a ticket, so it
    // must not collect a registration that promises one. The waitlist is the
    // honest alternative.
    if (!paymentsEnabled) {
      await joinWaitlist(email, 'payments-unavailable').catch(() => undefined);
      ctx.log('warn', 'registration refused: payments not configured');
      return NextResponse.json(
        {
          code: 'payments_unavailable',
          waitlist: true,
          message: 'Registration opens soon. Leave your email and we will tell you when it does.',
        },
        { status: 503, headers: { 'Retry-After': '3600' } },
      );
    }

    // ---- write -----------------------------------------------------------
    const result = await createRegistration(
      { fullName, email, mobile, dateOfBirth, cityState, ref, ipHash: hashIp(ip) },
      settings.maxRegistrations,
    );

    tickSoon('register');

    if (result.ok) {
      if (idempotencyKey) await recordIdempotency('register', idempotencyKey, result.publicId, 200);
      ctx.log('info', 'registration accepted', { existing: result.existing });
      return NextResponse.json({ publicId: result.publicId }, { status: 200 });
    }

    if (result.reason === 'full') {
      await joinWaitlist(email, 'capacity-full').catch(() => undefined);
      return NextResponse.json(
        {
          code: 'full',
          waitlist: true,
          message: 'Registration is full right now. Leave your email and we will contact you if a spot opens.',
        },
        { status: 409 },
      );
    }

    if (result.reason === 'duplicate') {
      return NextResponse.json({ message: RESERVE.errors.duplicate }, { status: 409 });
    }

    ctx.log('error', 'registration failed');
    return NextResponse.json({ message: RESERVE.errors.generic }, { status: 500 });
  });
}