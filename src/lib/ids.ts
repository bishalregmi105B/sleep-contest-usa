import { randomBytes, randomUUID } from 'node:crypto';

/**
 * Identifier generation.
 *
 * `publicId` appears in ticket URLs, so it must be unguessable: a sequential id
 * would let anyone walk /ticket/1, /ticket/2 and read other people's names.
 */

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes

function randomString(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** Ticket URL id. 16 chars of a 31-symbol alphabet, so ~80 bits of entropy. */
export function newPublicId(): string {
  return randomString(16);
}

/** Referral code shown on the ticket and shared by the entrant. */
export function newRefCode(): string {
  return randomString(8).toUpperCase();
}

/** Correlation id for logs. Never contains personal data. */
export function newRequestId(): string {
  return randomUUID();
}