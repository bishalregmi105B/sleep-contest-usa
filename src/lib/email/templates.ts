import { SITE, TICKET, TIMELINE, usd } from '@/content/site';

/** Params for the confirmation email. Declared here, not imported from the
 * provider, so the template has no dependency on the transport. */
export type ConfirmationParams = {
  readonly firstName: string;
  readonly matNumber: number;
  readonly ticketUrl: string;
  readonly refundNote: string;
};

export type RenderedEmail = { readonly subject: string; readonly html: string; readonly text: string };

/**
 * Confirmation email, as a single HTML string plus a plain-text version.
 *
 * Table layout with inline styles, because that is what email clients actually
 * render: `flex`, `grid` and `<style>` blocks are stripped by Outlook and by
 * most webmail clients. Colours are the site's own, kept dark and light safe by
 * wrapping every block in a background colour rather than relying on the
 * client's default.
 *
 * The subject says the mat number, because that is the one thing an entrant
 * wants to find in their inbox.
 */
export function renderConfirmation({
  firstName,
  matNumber,
  ticketUrl,
  refundNote,
}: ConfirmationParams): RenderedEmail {
  const subject = `You're in. Your mat number is ${matNumber}.`;

  const goal = SITE.goal.toLocaleString('en-US');
  const steps = TIMELINE.steps.slice(0, 3);

  const text = [
    `Hi ${firstName},`,
    '',
    `Your mat is reserved for ${SITE.name}.`,
    '',
    `Mat number: ${matNumber}`,
    `Ticket:     ${ticketUrl}`,
    '',
    'What happens next:',
    ...steps.map((step, i) => `  ${i + 1}. ${step.title} — ${step.detail}`),
    '',
    refundNote,
    `Rules: ${ticketUrl.replace(/\/ticket\/.*/, '/rules')}`,
    `Contact: ${SITE.email || 'the address on this site'}`,
  ].join('\n');

  const row = (label: string, value: string) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #241B55;color:#B9B4D6;font:400 13px/1.4 Arial,Helvetica,sans-serif;vertical-align:top;width:110px">
          ${label}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #241B55;color:#F3EBDD;font:700 15px/1.4 'Courier New',monospace;vertical-align:top">
          ${value}
        </td>
      </tr>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${subject}</title>
  </head>
  <!-- A preheader: the first line inbox previews, which the body never repeats. -->
  <body style="margin:0;padding:0;background:#07060F">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Mat number ${matNumber} &middot; ${SITE.name}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07060F;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:560px;background:#0B0620;border:1px solid #241B55;border-radius:14px;overflow:hidden">

            <!-- Masthead -->
            <tr>
              <td style="padding:28px 32px 8px">
                <p style="margin:0;font:700 13px/1.2 Arial,Helvetica,sans-serif;color:#FFB867;letter-spacing:2px;text-transform:uppercase">
                  ${SITE.name}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0">
                <h1 style="margin:0;font:800 34px/1.05 Arial,Helvetica,sans-serif;color:#F3EBDD;letter-spacing:-0.5px">
                  You're in.
                </h1>
                <p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:#B9B4D6">
                  Hi ${escapeHtml(firstName)}, your mat is reserved.
                </p>
              </td>
            </tr>

            <!-- Mat details -->
            <tr>
              <td style="padding:24px 32px 0">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row('Mat number', String(matNumber).padStart(6, '0'))}
                  ${row('Status', 'Reserved')}
                  ${row('Total', usd(Number('39.99')))}
                </table>
              </td>
            </tr>

            <!-- Call to action -->
            <tr>
              <td align="center" style="padding:28px 32px 0">
                <a href="${escapeAttr(ticketUrl)}"
                   style="display:inline-block;background:#E8467F;color:#1A0B12;font:700 15px/1 Arial,Helvetica,sans-serif;
                          padding:16px 32px;border-radius:9999px;text-decoration:none;letter-spacing:0.5px">
                  View your ticket
                </a>
              </td>
            </tr>

            <!-- What happens next -->
            <tr>
              <td style="padding:32px 32px 0">
                <p style="margin:0 0 12px;font:700 12px/1.2 Arial,Helvetica,sans-serif;color:#B9B4D6;letter-spacing:2px;text-transform:uppercase">
                  What happens next
                </p>
                <ol style="margin:0;padding:0 0 0 18px;color:#F3EBDD;font:400 14px/1.6 Arial,Helvetica,sans-serif">
                  ${steps.map((step) => `<li style="margin:0 0 6px">${escapeHtml(step.title)}</li>`).join('')}
                </ol>
              </td>
            </tr>

            <!-- Refund promise, immediately under the ask -->
            <tr>
              <td style="padding:20px 32px 0">
                <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#B9B4D6">
                  ${escapeHtml(refundNote)}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:28px 32px 28px">
                <p style="margin:0 0 10px;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#B9B4D6">
                  <a href="${escapeAttr(ticketUrl.replace(/\/ticket\/.*/, '/rules'))}"
                     style="color:#FFB867;text-decoration:underline">Official rules</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${escapeAttr(ticketUrl.replace(/\/ticket\/.*/, '/refund'))}"
                     style="color:#FFB867;text-decoration:underline">Refund policy</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${escapeAttr(ticketUrl.replace(/\/ticket\/.*/, '/privacy'))}"
                     style="color:#FFB867;text-decoration:underline">Privacy</a>
                </p>
                <p style="margin:0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6E6A8C">
                  Organised by ${escapeHtml(SITE.organizer)}. The date is announced once
                  ${goal} people have registered, and registrants are emailed first.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/** Escapes text for safe interpolation into the HTML body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes a value used inside an href, where a quote would break the attribute. */
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/javascript:/gi, '');
}

/** Re-exported so the console provider shows the same wording a visitor gets. */
export { TICKET };
/**
 * "Complete your payment" email.
 *
 * Sent when a registration is saved but payment could not be started, which
 * happens when Stripe is unreachable at checkout time. It has to be honest
 * about that: the entrant's details are held, no mat has been issued, and the
 * link brings them back to finish. Sending this is materially different from the
 * confirmation, so it has its own template and its own wording.
 */
export function renderCompletePayment({
  firstName,
  ticketUrl,
}: {
  readonly firstName: string;
  readonly ticketUrl: string;
}): RenderedEmail {
  const subject = `Your ${SITE.name} registration is saved — complete payment here`;

  const text = [
    `Hi ${firstName},`,
    '',
    'Your registration details are saved and your spot is being held.',
    '',
    'Payment is temporarily unavailable, so we could not take your payment just now. No mat number has been issued yet, and you have not been charged.',
    '',
    `Finish payment here: ${ticketUrl}`,
    '',
    'If you would rather not pay now, reply to this email and we will release your hold — no hard feelings, and no charge.',
  ].join('\n');

  const button = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:8px 0 24px;">
      <tr><td align="center">
        <a href="${escapeAttr(ticketUrl)}"
           style="display:inline-block;background:#F5C518;color:#0B1020;text-decoration:none;
                  padding:14px 28px;border-radius:999px;font-weight:700;font-size:16px;">
          Complete payment
        </a>
      </td></tr>
    </table>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0B1020;font-family:Helvetica,Arial,sans-serif;color:#F4F1EA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B1020;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#F4F1EA;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0B1020;padding:24px 32px;">
          <span style="color:#F5C518;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">
            ${escapeHtml(SITE.name)}
          </span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#0B1020;">
            Your registration is saved
          </h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2B2B2B;">
            Hi ${escapeHtml(firstName)}, your details are safe and your spot is being held.
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2B2B2B;">
            Payment is temporarily unavailable, so we could not take it just now. No mat number has been
            issued and you have not been charged.
          </p>
          ${button}
          <p style="margin:0;font-size:14px;line-height:1.6;color:#5A5A5A;">
            Prefer not to pay now? Reply to this email and we will release your hold.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}
