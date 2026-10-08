#!/usr/bin/env node
/**
 * Aligns the Prisma datasource provider with the database actually in use.
 *
 * Prisma requires the schema to name the provider of the database being talked
 * to, and it does not allow one schema to serve both. Getting this wrong is a
 * hard failure rather than a warning: pointing a sqlite schema at a Postgres
 * DATABASE_URL throws PrismaClientInitializationError, which took the whole
 * Vercel build down.
 *
 * Rather than making it a manual step that gets forgotten, `auto` reads
 * DATABASE_URL and picks the provider to match. Run automatically from
 * predev, prebuild and postinstall.
 *
 * Usage:
 *   node scripts/set-db-provider.mjs auto
 *   node scripts/set-db-provider.mjs postgresql   # force
 *   node scripts/set-db-provider.mjs sqlite        # force
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCHEMA = path.join(path.resolve(import.meta.dirname, '..'), 'prisma/schema.prisma');

const arg = process.argv[2] ?? 'auto';

function resolveTarget() {
  if (arg === 'postgresql' || arg === 'sqlite') return arg;

  if (arg !== 'auto') {
    console.error('Usage: node scripts/set-db-provider.mjs auto|postgresql|sqlite');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL ?? '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
    ? 'postgresql'
    : 'sqlite';
}

const target = resolveTarget();
const source = await readFile(SCHEMA, 'utf8');
const updated = source.replace(
  /(datasource db \{\s*provider = ")(?:sqlite|postgresql)(")/,
  `$1${target}$2`,
);

if (source !== updated) {
  await writeFile(SCHEMA, updated);
  console.log(`[db] provider set to ${target}`);
}
