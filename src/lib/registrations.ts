import { RESERVE, SITE } from '@/content/site';
import { env, resendEnabled } from '@/lib/env';
import { consoleProvider } from '@/lib/email/console';
import { resendProvider } from '@/lib/email/resend';
import type { EmailProvider } from '@/lib/email';
import { getStore } from '@/lib/store';

/**
 * Registration workflows.
 *
 * These talk to whichever store is configured rather than to Prisma directly, so
 * the demo runs with no database and production runs on one without any of the
 * call sites changing.
 */

export function emailProvider(): EmailProvider {
  return resendEnabled ? resendProvider : consoleProvider;
}

/**
 * Marks a registration paid and assigns its mat number. Idempotent: calling it
 * twice for the same registration does not burn a second mat number.
 */
export async function markPaid(
  publicId: string,
  payment: { provider: string; ref: string | null },
) {
  return getStore().markPaid(publicId, payment);
}

/** Sends the confirmation email. A mail failure must never fail a payment. */
export async function sendConfirmation(params: {
  readonly email: string;
  readonly firstName: string;
  readonly matNumber: number;
  readonly publicId: string;
}): Promise<void> {
  try {
    await emailProvider().sendConfirmation({
      to: params.email,
      firstName: params.firstName,
      matNumber: params.matNumber,
      ticketUrl: `${env.siteUrl}/ticket/${params.publicId}`,
      refundNote: RESERVE.note,
    });
  } catch (err) {
    // Log the failure, never the address.
    console.error('[email] confirmation failed:', err instanceof Error ? err.message : 'unknown');
  }
}

/** Paid registration count, the number the counter shows. */
export async function paidCount(): Promise<number> {
  return getStore().countPaid();
}

/** Shareable referral link for a registration. */
export function referralLink(refCode: string): string {
  return `${env.siteUrl}/friends?ref=${refCode}`;
}

export { SITE };
