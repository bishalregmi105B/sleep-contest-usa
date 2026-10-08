import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires an explicit driver adapter. The adapter is chosen from
 * DATABASE_URL, so the same code runs against a local SQLite file with no
 * setup, and against PostgreSQL in production without a code change.
 *
 * Only ever import this from the server: it reaches the filesystem or the
 * network and must never end up in the client bundle.
 */

function createClient(): PrismaClient {
  const url = env.databaseUrl;

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }

  // SQLite paths may be written with or without the file: scheme.
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: url.replace(/^file:/, '') }),
  });
}

/**
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection pool on every save.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
