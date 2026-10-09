import { NextResponse, connection } from 'next/server';
import { getPublicSettings } from '@/lib/settings';
import { fallbackKV, withKV } from '@/lib/kv';


const CACHE_KEY = 'settings:public:v1';

/**
 * GET /api/settings/public
 *
 * The subset of settings the browser is allowed to see.
 *
 * Cached at the CDN for 15 seconds and in Redis for the same window, which is
 * what makes an admin change to the cap or the milestone ladder visible within
 * the 15 seconds the brief asked for. An admin write also deletes the key
 * immediately, so the effect is instant on the instance that wrote it.
 *
 * The response cannot be `private`: it is not personal data, and the whole
 * point is that a CDN can serve it.
 */
export async function GET() {
  // Settings are admin-editable and must reflect the current value, not the
  // value at build time.
  await connection();

  const cached = await withKV(
    (kv) => kv.get(CACHE_KEY),
    () => fallbackKV.get(CACHE_KEY),
  );
  if (cached) return respond(JSON.parse(cached));

  const settings = await getPublicSettings();
  const body = JSON.stringify(settings);
  await withKV(
    (kv) => kv.set(CACHE_KEY, body, 15),
    () => fallbackKV.set(CACHE_KEY, body, 15),
  );
  return respond(settings);
}

function respond(settings: unknown) {
  return NextResponse.json(settings, {
    headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
  });
}
