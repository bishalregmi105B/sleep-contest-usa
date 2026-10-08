import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { SITE } from '@/content/site';
import { getStore } from '@/lib/store';

/**
 * GET /api/stats
 *
 * The live counter. Counts paid registrations only: a reservation that has not
 * been paid does not hold a mat, so it does not count towards the goal.
 *
 * `connection()` forces this to be answered per request. Without it the route is
 * prerendered as static and serves a count frozen at build time, so the counter
 * never moves.
 */
export async function GET() {
  await connection();

  const count = await getStore().countPaid();

  return NextResponse.json(
    { count, goal: SITE.goal },
    {
      headers: {
        // Client islands refresh this every 60s.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
