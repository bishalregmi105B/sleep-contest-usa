import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { env } from './env';

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires an explicit driver adapter. We use the better-sqlite3
 * adapter by default so the site runs with no external database; switching to
 * PostgreSQL means changing DATABASE_URL, the adapter, and the provider in
 * prisma/schema.prisma.
 *
 * Only ever import this from the server: it reaches the filesystem and must
 * never end up in the client bundle.
 */

const isPostgres = env.databaseUrl.startsWith('postgres');

/**
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection pool on every save.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (isPostgres) {
    // PostgreSQL is a production path; it needs @prisma/adapter-pg installed.
    // Falls through to the default client if the adapter is absent.
    throw new Error(
      'PostgreSQL requires @prisma/adapter-pg. Run: npm i @prisma/adapter-pg',
    );
  }

  const url = env.databaseUrl.replace(/^file:/, '');
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}