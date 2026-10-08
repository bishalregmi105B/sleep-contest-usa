import type { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Prisma client.
 *
 * Prisma 7 requires an explicit driver adapter, chosen here from DATABASE_URL so
 * the same code runs against a local SQLite file with no setup and against
 * PostgreSQL in production. The datasource provider in prisma/schema.prisma is
 * switched to match by scripts/set-db-provider.mjs, which runs on postinstall,
 * prebuild and predev.
 *
 * **Lazy on purpose.** Constructing the client throws if the provider and the
 * URL disagree. Building it at module scope meant a single mismatch broke every
 * route that imported this module, and the whole production build. Deferring it
 * to first use means a mistake surfaces as one clear request failing instead of
 * taking the deployment down.
 *
 * Only ever import this from the server: it reaches the filesystem or the
 * network and must never end up in the client bundle.
 */

let client: PrismaClient | undefined;

/** Memoised on globalThis so dev hot-reloads do not open a new pool each save. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

async function createClient(): Promise<PrismaClient> {
  const { PrismaClient: Client } = await import('@prisma/client');
  const url = env.databaseUrl;

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    return new Client({ adapter: new PrismaPg({ connectionString: url }) });
  }

  const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
  return new Client({ adapter: new PrismaBetterSqlite3({ url: url.replace(/^file:/, '') }) });
}

export async function getDb(): Promise<PrismaClient> {
  if (client) return client;
  client = globalForPrisma.prisma ?? (await createClient());
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

/**
 * The client, for the common case. Throws the same clear error as before, but
 * only when a query is actually run.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (!client) {
      throw new Error(
        'Database client used before initialisation. Call getDb() first.',
      );
    }
    return Reflect.get(client, property);
  },
});
