import { NextResponse, connection } from 'next/server';
import { assertSameOrigin, requireAdmin } from '@/lib/auth';
import { clientIp, hashIp } from '@/lib/privacy';
import { getSettings, recentSettingsAudit, updateSettings } from '@/lib/settings';


/**
 * GET /api/admin/settings
 *
 * The full settings document plus the recent change log. Admin only.
 */
export async function GET() {
  await connection();

  const denied = await requireAdmin();
  if (denied) return denied;

  const [settings, audit] = await Promise.all([getSettings(), recentSettingsAudit(20)]);
  return NextResponse.json({ settings, audit });
}

/**
 * POST /api/admin/settings
 *
 * Writes the settings document. Validated first, then applied in one
 * transaction with an audit row per changed key, so a rejected change cannot
 * leave the cap lowered and the goal not.
 *
 * Origin-checked, because this is the endpoint that can change what every
 * visitor sees.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 });
  }

  const result = await updateSettings(body, { adminId: 'admin', ipHash: hashIp(clientIp(request)) });

  if (!result.ok) {
    return NextResponse.json({ message: 'Some settings could not be saved.', errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true, settings: result.settings });
}
