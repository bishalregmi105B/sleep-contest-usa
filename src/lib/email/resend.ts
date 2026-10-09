import { Resend } from 'resend';
import { env } from '@/lib/env';
import type { EmailMessage, EmailProvider } from './index';

/**
 * Resend email provider. Only used when RESEND_API_KEY and EMAIL_FROM are set.
 *
 * Resend returns `{ error }` rather than throwing on a rejected send, so the
 * error is checked explicitly: an unchecked error would mark a message as
 * delivered when it never left the building, which is precisely the failure the
 * outbox exists to prevent.
 */
export const resendProvider: EmailProvider = {
  name: 'resend',

  async send(message: EmailMessage) {
    const resend = new Resend(env.resendApiKey);

    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.headers ? { headers: { ...message.headers } } : {}),
    });

    if (error) throw new Error(error.message);
  },
};
