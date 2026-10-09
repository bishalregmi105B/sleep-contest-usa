import { renderConfirmation } from './templates';
import type { EmailProvider } from './index';

/**
 * Console email provider.
 *
 * Prints exactly what a registrant would receive, rendered by the same template
 * the Resend provider sends, so what is checked in development is what is
 * delivered in production. Addresses and names appear because this is a
 * development convenience; nothing else in the codebase logs personal data.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',

  async sendConfirmation(params) {
    const { subject, text } = renderConfirmation(params);

    console.info(
      `\n[email:console] to=${params.to}\n[email:console] subject=${subject}\n${text}\n`,
    );
  },
};