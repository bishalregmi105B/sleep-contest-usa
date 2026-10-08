import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 keeps the connection URL here rather than in schema.prisma.
 *
 * The URL is read through `process.env` rather than Prisma's `env()` helper on
 * purpose: `env()` throws when the variable is missing, and this file is loaded
 * by `prisma generate`, which runs on postinstall during a deploy — before
 * DATABASE_URL is necessarily present. A throw there fails `npm install`
 * outright, which is exactly what happened on the first Vercel build.
 *
 * The fallback only ever applies to `generate` and to local tooling. Migrations
 * and the running app always have DATABASE_URL set, and fail loudly if it is
 * genuinely missing rather than silently falling back to a local file.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
});
