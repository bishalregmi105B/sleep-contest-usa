import { db } from '@/lib/db';
import { RESERVE, SITE } from '@/content/site';
import { env, resendEnabled } from '@/lib/env';
import { consoleProvider } from '@/lib/email/console';
import { resendProvider } from '@/lib/email/resend';
import type { EmailProvider } from '@/lib/email';
import { newRefCode } from '@/lib/ids';

export function emailProvider(): EmailProvider {
  return resendEnabled ? resendProvider : consoleProvider;
}

/**
 * Marks a registration paid and assigns its mat number.
 *
 * The mat number is max + 1 inside a transaction, retried on the rare unique
 * conflict caused by two payments landing at once. Idempotent: calling it twice
 * for the same registration is a no-op.
 */
export async function markPaid(
  publicId: string,
  payment: { provider: string; ref: string | null },
): Promise<{ matNumber: number; firstName: string; email: string } | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await db.$transaction(async (tx) => {
        const registration = await tx.registration.findUnique({ where: { publicId } });
        if (!registration) return null;

        // Already paid: nothing to do, and do not burn another mat number.
        if (registration.status === 'paid' && registration.matNumber !== null) {
          return {
            matNumber: registration.matNumber,
            firstName: registration.fullName.split(' ')[0] ?? registration.fullName,
            email: registration.email,
            alreadyPaid: true,
          };
        }

        const last = await tx.registration.findFirst({
          where: { matNumber: { not: null } },
          orderBy: { matNumber: 'desc' },
          select: { matNumber: true },
        });

        const matNumber = (last?.matNumber ?? 0) + 1;

        const updated = await tx.registration.update({
          where: { id: registration.id },
          data: {
            status: 'paid',
            matNumber,
            paidAt: new Date(),
            paymentProvider: payment.provider,
            paymentRef: payment.ref,
          },
        });

        return {
          matNumber,
          firstName: updated.fullName.split(' ')[0] ?? updated.fullName,
          email: updated.email,
          alreadyPaid: false,
        };
      });

      return result;
    } catch (err) {
      const code = err instanceof Error && 'code' in err ? (err as { code?: string }).code : null;
      // P2002 is a unique constraint: another payment took this mat number.
      if (code === 'P2002' && attempt < 4) continue;
      throw err;
    }
  }

  return null;
}

/** Sends the confirmation email. Never lets a mail failure fail a payment. */
export async function sendConfirmation(params: {
  readonly email: string;
  readonly firstName: string;
  readonly matNumber: number;
  readonly publicId: string;
}): Promise<void> {
  const provider = emailProvider();
  try {
    await provider.sendConfirmation({
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
  return db.registration.count({ where: { status: 'paid' } });
}

/** Shareable referral link for a registration. */
export function referralLink(refCode: string): string {
  return `${env.siteUrl}/friends?ref=${refCode}`;
}

export { SITE, newRefCode };