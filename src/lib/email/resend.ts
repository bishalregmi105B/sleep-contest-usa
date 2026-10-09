import { Resend } from 'resend';
import { env } from '@/lib/env';
import { renderConfirmation } from './templates';
import type { EmailProvider } from './index';

/**
 * Resend email provider. Only used when RESEND_API_KEY and EMAIL_FROM are set.
 *
 * The message itself lives in `templates.ts`, shared with the console provider,
 * so a developer reading their terminal sees exactly what a registrant receives.
 */
export const resendProvider: EmailProvider = {
  name: 'resend',

  async sendConfirmation(params) {
    const resend = new Resend(env.resendApiKey);
    const { subject, html, text } = renderConfirmation(params);

    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: params.to,
      subject,
      html,
      text,
    });

    if (error) throw new Error(error.message);
  },
};