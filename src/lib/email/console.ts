import { SITE } from '@/content/site';
import type { EmailProvider } from './index';

/**
 * Console email provider.
 *
 * Prints the rendered message to the terminal. Addresses and names are shown
 * because this is a development convenience, but nothing else in the codebase
 * logs personal data.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',

  async sendConfirmation({ to, firstName, matNumber, ticketUrl, refundNote }) {
    const subject = `You're in! Mat #${matNumber}`;
    const body = [
      `Hi ${firstName},`,
      '',
      `Your mat is reserved for ${SITE.name}.`,
      '',
      `  Mat number: ${matNumber}`,
      `  Ticket:     ${ticketUrl}`,
      '',
      refundNote,
      '',
      `We will email you the date and venue as soon as ${SITE.goal.toLocaleString('en-US')} people have registered.`,
    ].join('\n');

    console.info(`\n[email:console] to=${to}\n[email:console] subject=${subject}\n${body}\n`);
  },
};