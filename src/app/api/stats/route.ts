import { NextResponse } from 'next/server';
import { SITE } from '@/content/site';
import { db } from '@/lib/db';


/**
 * GET /api/stats
 *
 * The live counter. Counts paid registrations only: a reservation that has not
 * been paid does not hold a mat, so it does not count towards the goal.
 */
export async function GET() {
  const count = await db.registration.count({ where: { status: 'paid' } });

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
