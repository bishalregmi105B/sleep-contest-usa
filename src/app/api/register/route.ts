import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { newPublicId, newRefCode } from '@/lib/ids';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { RESERVE } from '@/content/site';
import { fieldErrors, registrationSchema } from '@/lib/validators';


/**
 * POST /api/register
 *
 * Creates a pending registration and returns its publicId. Payment happens in
 * /api/checkout, so a visitor who abandons checkout leaves a pending row that
 * can be resumed rather than a lost one.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`register:${ip}`, { perMinute: 5, burst: 5 })) {
    return NextResponse.json(
      { message: 'Too many attempts. Wait a minute and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
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

  const { fullName, email, mobile, dateOfBirth, cityState, ref, company } = parsed.data;

  // Honeypot: answer as though it worked so bots do not learn anything.
  if (company) {
    return NextResponse.json({ publicId: newPublicId() });
  }

  const normalizedEmail = email.toLowerCase();

  try {
    // An entrant with the same address should never end up with two mats.
    const existing = await db.registration.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === 'paid') {
      return NextResponse.json({ message: RESERVE.errors.duplicate }, { status: 409 });
    }

    // Reuse a pending registration so a double submit is idempotent.
    if (existing) {
      const updated = await db.registration.update({
        where: { id: existing.id },
        data: { fullName, mobile, cityState, dateOfBirth: new Date(dateOfBirth) },
      });
      return NextResponse.json({ publicId: updated.publicId });
    }

    // Credit the referrer only when the code exists.
    let referredBy: string | null = null;
    if (ref) {
      const referrer = await db.registration.findUnique({ where: { refCode: ref } });
      referredBy = referrer?.refCode ?? null;
    }

    // publicId and refCode are unique; retry a couple of times on the rare
    // collision rather than failing the registration.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const created = await db.registration.create({
          data: {
            publicId: newPublicId(),
            fullName,
            email: normalizedEmail,
            mobile,
            dateOfBirth: new Date(dateOfBirth),
            cityState,
            consentAt: new Date(),
            refCode: newRefCode(),
            referredBy,
            status: 'pending',
            paymentProvider: 'mock',
          },
        });
        return NextResponse.json({ publicId: created.publicId }, { status: 201 });
      } catch (err) {
        const isUnique =
          err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002';
        if (isUnique && attempt < 2) continue;
        throw err;
      }
    }

    return NextResponse.json({ message: RESERVE.errors.generic }, { status: 500 });
  } catch {
    // Never log the payload: it holds personal data.
    console.error('[register] failed to create registration');
    return NextResponse.json({ message: RESERVE.errors.generic }, { status: 500 });
  }
}
