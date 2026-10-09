#!/usr/bin/env node
/**
 * Generates the admin password hash for ADMIN_PASSWORD_HASH.
 *
 *   npm run admin:hash -- "the password"
 *
 * ## Why the separator is a dot and not a dollar sign
//
// An earlier version used the conventional `$` separator, and it broke in a way
// that is very hard to see from the code: the hash was correct in the file, the
// verifier was correct, and the admin password simply never worked.
//
// `.env` files are shell-flavoured. Sourcing one — which `source .env`,
// `set -a; . .env.local`, Docker's `env_file` and systemd all effectively do —
// expands `$1`, `$8` and `$d4Pvk…` as shell parameters and deletes them. A
// 130-character hash arrived at the server as 102 characters of nonsense, with
// no error anywhere.
//
// Base64 uses `A-Za-z0-9+/=`, so a dot cannot appear in either half. Dot
// separators survive every .env loader and every shell.
//
// ## Why this file duplicates the parameters in src/lib/auth.ts
 *
 * Deliberately. This runs before the app is configured, on whatever Node the
 * operator happens to have, and it must not depend on tsconfig path aliases or
 * on `jose` or `next/headers` resolving — importing the real module is exactly
 * what failed the first time this was written.
 *
 * So the parameters are repeated here, and `tests/integration/admin-auth.test.ts`
 * asserts that a hash produced by this script verifies against `passwordMatches`
 * from the app. If the two ever drift, that test fails rather than locking the
 * operator out.
 */

import { randomBytes, scryptSync } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:hash -- "<password>"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Refusing: use at least 12 characters. A weak admin password is the cheapest way in.');
  process.exit(1);
}

const salt = randomBytes(16);
const derived = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });

console.log(`\nADMIN_PASSWORD_HASH=scrypt.${N}.${R}.${P}.${salt.toString('base64')}.${derived.toString('base64')}\n`);
