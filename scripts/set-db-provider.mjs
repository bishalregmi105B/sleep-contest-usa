#!/usr/bin/env node
/**
 * Switches the Prisma datasource provider.
 *
 * The schema has to name the provider that matches the database actually being
 * talked to, and Prisma does not allow one schema to serve both. SQLite is the
 * default because it needs no setup at all; a hosted platform such as Vercel
 * has an ephemeral filesystem, so it needs PostgreSQL and a managed database URL.
 *
 * Usage: node scripts/set-db-provider.mjs postgresql|sqlite
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma/schema.prisma');

const target = process.argv[2];

if (target !== 'sqlite' && target !== 'postgresql') {
  console.error('Usage: node scripts/set-db-provider.mjs postgresql|sqlite');
  process.exit(1);
}

const source = await readFile(SCHEMA, 'utf8');
const updated = source.replace(
  /(datasource db \{\s*provider = ")(sqlite|postgresql)(")/,
  `$1${target}$3`,
);

if (source === updated) {
  console.log(`Provider is already ${target}.`);
} else {
  await writeFile(SCHEMA, updated);
  console.log(`Provider set to ${target}.`);
  console.log('Run: npx prisma generate');
}

void ROOT;
