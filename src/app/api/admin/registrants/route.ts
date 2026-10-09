import { NextResponse, connection } from 'next/server';
import { assertSameOrigin, requireAdmin } from '@/lib/auth';
import { clientIp, hashIp } from '@/lib/privacy';
import { deleteOrAnonymize, listRegistrations, setInternal } from '@/lib/repository';
import { log } from '@/lib/logger';


/**
 * GET /api/admin/registrants
 *
 * Keyset-paginated, not offset-paginated. OFFSET makes page N read and discard
 * N x pageSize rows, so at 200,000 registrations page 500 scans 10,000 rows to
 * display 20.
 *
 * The cursor is the last row's (createdAt, id), which is what reg_status_created_ix
 * already supports.
 */
export async function GET(request: Request) {
  await connection();

  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(request.url);
  const limit = Math.min(200, Number(url.searchParams.get('limit') ?? '50'));
  const status = url.searchParams.get('status') || undefined;
  const query = url.searchParams.get('q') || undefined;
  const cursorParam = url.searchParams.get('cursor');

  const cursor = cursorParam
    ? { createdAt: new Date(cursorParam.split('|')[0] as string), id: BigInt((cursorParam.split('|')[1] ?? '0') as string) }
    : null;

  const { rows, nextCursor } = await listRegistrations({ limit, cursor, status, query });

  return NextResponse.json(
    {
      rows,
      nextCursor: nextCursor
        ? `${nextCursor.createdAt.toISOString()}|${nextCursor.id.toString()}`
        : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * POST /api/admin/registrants
 *
 * Two mutations, both audited and both origin-checked:
 *
 *   { action: 'internal', publicId, isInternal }
 *   { action: 'delete',    publicId, mode: 'anonymize' | 'delete' }
 *
 * Anonymise is the default for a paid registration: it preserves the mat number
 * and the count while removing the personal data. A hard delete is refused for a
 * paid registration, because that would silently change the public counter and
 * leave a paid entrant with no ticket.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const { action, publicId } = body;
  if (typeof publicId !== 'string' || !publicId) {
    return NextResponse.json({ message: 'publicId is required.' }, { status: 400 });
  }

  const actor = { adminId: 'admin', ipHash: hashIp(clientIp(request)) };

  if (action === 'internal') {
    await setInternal(publicId, Boolean(body.isInternal));
    log.info('admin: changed internal flag', { ...actor, isInternal: Boolean(body.isInternal) });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const mode = body.mode === 'delete' ? 'delete' : 'anonymize';
    const result = await deleteOrAnonymize(publicId, mode);
    if (!result.ok) {
      return NextResponse.json(
        { message: 'That registrant could not be removed.', reason: result.reason },
        { status: 400 },
      );
    }
    log.info('admin: registrant removed', { ...actor, mode });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: 'Unknown action.' }, { status: 400 });
}
