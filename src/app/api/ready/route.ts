import { connection } from 'next/server';
import { pingDatabase } from '@/lib/db';
import { getKV } from '@/lib/kv';
import { isProduction } from '@/lib/env';


/**
 * GET /api/ready
 *
 * Readiness, as distinct from liveness.
 *
 * `/api/health` answers "is this process running and configured". This answers
 * "can it actually serve traffic right now", which means the database and Redis
 * both answer. A platform load balancer routes on this: without it, a deployment
 * whose database connection has gone away keeps receiving requests and failing
 * every one of them.
 *
 * Redis being unavailable is reported but does not fail readiness on its own,
 * because the site is required to keep taking registrations without it (with
 * degraded rate limiting). A database that is down does fail it, because nothing
 * works without the database.
 */
export async function GET() {
  // Polled by the load balancer. A cached 200 would report a recovered
  // dependency as still broken.
  await connection();

  const database = await pingDatabase();
  const redis = await getKV().ping().catch(() => false);

  const checks = { database, redis };
  const ready = database;

  return Response.json(
    {
      ready,
      checks,
      degraded: !redis,
      note: !redis
        ? 'Redis is unavailable. Rate limiting is per-instance and the stats cache falls back to the database.'
        : undefined,
      environment: isProduction ? 'production' : 'development',
    },
    {
      // Never cached: this is the endpoint a load balancer polls.
      headers: { 'Cache-Control': 'no-store' },
      status: ready ? 200 : 503,
    },
  );
}
