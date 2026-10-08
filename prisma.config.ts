import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 keeps the connection URL here rather than in schema.prisma.
 *
 * Swapping SQLite for PostgreSQL in production is a one-line change: set
 * DATABASE_URL to a postgres:// connection string and change the datasource
 * provider in prisma/schema.prisma.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});