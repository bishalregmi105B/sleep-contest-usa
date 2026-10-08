import { z } from 'zod';
import { SITE } from '@/content/site';
import { RESERVE } from '@/content/site';

/**
 * Shared validation.
 *
 * The same schema runs on the client (via react-hook-form) and on the server
 * (in /api/register), so the two can never disagree about what is valid.
 */

/** `true` when the person is SITE.minAge or older as of today. */
export function isAdult(dateOfBirth: Date, today = new Date()): boolean {
  if (Number.isNaN(dateOfBirth.getTime())) return false;
  const eighteenth = new Date(dateOfBirth);
  eighteenth.setFullYear(eighteenth.getFullYear() + SITE.minAge);
  return eighteenth <= today;
}

const name = z
  .string()
  .trim()
  .min(2, RESERVE.errors.fullName)
  .max(80, RESERVE.errors.fullName);

const email = z
  .string()
  .trim()
  .min(1, RESERVE.errors.email)
  .max(254)
  .email(RESERVE.errors.email)
  // Accepts the shapes people actually type.
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/, RESERVE.errors.email);

const mobile = z
  .string()
  .trim()
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, RESERVE.errors.mobile);

const dateOfBirth = z
  .string()
  .trim()
  .min(1, RESERVE.errors.dateOfBirth)
  .refine((v) => {
    const parsed = new Date(v);
    if (Number.isNaN(parsed.getTime())) return false;
    // Reject dates in the future.
    if (parsed > new Date()) return false;
    return isAdult(parsed);
  }, RESERVE.errors.dateOfBirth);

const cityState = z.string().trim().min(2, RESERVE.errors.cityState).max(120);

// Typed as boolean rather than literal true, so an unchecked box is a valid
// form value that the resolver then rejects with the consent message.
const consent = z
  .boolean()
  .refine((value) => value === true, RESERVE.errors.consent);

export const registrationSchema = z.object({
  fullName: name,
  email,
  mobile,
  dateOfBirth,
  cityState,
  consent,
  /** Optional referral code captured from ?ref=CODE. */
  ref: z.string().trim().max(16).optional(),
  /**
   * Honeypot. A real visitor never sees this field, so anything in it is a bot.
   * Validated as "must be empty" rather than dropped, so the server enforces it.
   */
  company: z.string().max(0, 'Rejected').optional().or(z.literal('')),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const checkoutSchema = z.object({
  publicId: z.string().trim().min(1).max(64),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

/** Flattens a Zod error into `{ field: message }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message;
  }
  return out;
}