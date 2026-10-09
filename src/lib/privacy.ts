import { createHash } from 'node:crypto';
import { env } from './env';

/**
 * Pseudonymising personal data.
 *
 * The registration table holds real names, emails, phone numbers and dates of
 * birth. Two of those are additionally stored outside it in hashed form:
 *
 *  - `ipHash`, so abuse can be investigated ("everyone from this range") and
 *    the setting-change audit has an actor, without storing the address. The
 *    privacy policy as written promises hashed IPs.
 *  - `emailHash`, for the per-email rate limit key, so the rate limiter does
 *    not need the plaintext and a Redis dump cannot be used to harvest
 *    addresses.
 *
 * Both are salted with `IP_PEPPER`, so a leaked table cannot be brute-forced
 * against a known IP space the way an unsalted SHA-256 could. The pepper never
 * leaves the server.
 */

/**
 * The pepper for hashed identifiers.
 *
 * One value for both hashes, taken from `IP_PEPPER`. A domain separator is
 * added at each call site instead (`ip:`, `email:`), so a hash of an IP can
 * never equal a hash of an email address.
 */
function pepper(): string {
  const configured = env.ipPepper || env.sessionSecret;
  // In development there may be no pepper; a fixed one is acceptable because
  // the data being hashed locally is test data. `assertServerConfigured`
  // rejects a production deployment without one.
  return configured || 'local-development-pepper';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`ip:${pepper()}:${ip}`).digest('hex').slice(0, 32);
}

export function hashEmail(email: string): string {
  return createHash('sha256')
    .update(`email:${pepper()}:${email.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Normalised email for storage and for the active-email uniqueness index.
 *
 * Lowercased and trimmed only. The local part is deliberately not stripped of
 * dots or `+tags`: Gmail treats `a.b@` and `ab@` as the same mailbox, but
 * `user+contest@` and `user+other@` are distinct mailboxes at most providers,
 * and silently merging them would let one person occupy another's spot or block
 * a legitimate entrant from registering. Over-normalising is a data-loss bug,
 * under-normalising is a duplicate-registration bug that a real inbox can
 * resolve. We take the second.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Best-effort E.164 conversion.
 *
 * The entrant types a local number, so a country code is inferred when the
 * input has no `+`. It is deliberately best-effort and not blocked on: a wrong
 * guess costs an operator one correction, whereas demanding a fully
 * international number at the top of a paid funnel costs conversions. The
 * stored value is what the entrant supplied plus the inferred code.
 */
export function normalizeMobile(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (hasPlus) return digits;

  // 10 digits and it starts with a US or Canadian area code.
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  // Anything else is assumed to already include its country code.
  return digits;
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? request.headers.get('cf-connecting-ip') ?? 'unknown';
}