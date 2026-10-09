#!/usr/bin/env node
/**
 * Generates the admin password hash for ADMIN_PASSWORD_HASH.
 *
 * Usage: npm run admin:hash -- "the password"
 *
 * The previous deployment read ADMIN_PASSWORD as plaintext. This produces the
 * scrypt hash that `lib/auth.ts` verifies against, so the plaintext never has to
 * exist in the environment.
 */

import { hashPassword } from '../src/lib/auth';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:hash -- "<password>"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Refusing: use at least 12 characters. A weak admin password is the cheapest way in.');
  process.exit(1);
}

console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(password) + '\n');
