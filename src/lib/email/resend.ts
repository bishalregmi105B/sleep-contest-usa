import { Resend } from 'resend';
import { SITE } from '@/content/site';
import { env } from '@/lib/env';
import type { EmailProvider } from './index';

/** Escapes text for safe interpolation into the HTML body. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Resend email provider. Only used when RESEND_API_KEY and EMAIL_FROM are set.
 */
export const resendProvider: EmailProvider = {
  name: 'resend',

  async sendConfirmation({ to, firstName, matNumber, ticketUrl, refundNote }) {
    const resend = new Resend(env.resendApiKey);

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0B0620;color:#FFF8E7;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto">
      <h1 style="font-size:28px;margin:0 0 16px">You're in!</h1>
      <p style="font-size:16px;line-height:1.5">Hi ${esc(firstName)},</p>
      <p style="font-size:16px;line-height:1.5">Your mat is reserved for ${esc(SITE.name)}.</p>
      <p style="font:700 22px/1.4 monospace;color:#FFE14A">Mat #${matNumber}</p>
      <p style="margin:24px 0">
        <a href="${esc(ticketUrl)}"
           style="display:inline-block;background:#FF4F8B;color:#1A0B12;font-weight:700;
                  padding:14px 28px;border-radius:9999px;text-decoration:none">
          View your ticket
        </a>
      </p>
      <p style="font-size:14px;line-height:1.5;color:#D9D2FF">${esc(refundNote)}</p>
      <p style="font-size:14px;line-height:1.5;color:#D9D2FF">
        We will email you the date and venue as soon as
        ${SITE.goal.toLocaleString('en-US')} people have registered.
      </p>
    </div>
  </body>
</html>`;

    const text = [
      `Hi ${firstName},`,
      '',
      `Your mat is reserved for ${SITE.name}.`,
      `Mat #${matNumber}`,
      `Ticket: ${ticketUrl}`,
      '',
      refundNote,
    ].join('\n');

    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to,
      subject: `You're in! Mat #${matNumber}`,
      html,
      text,
    });

    if (error) throw new Error(error.message);
  },
};