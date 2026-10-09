import type { EmailMessage, EmailProvider } from './index';

/**
 * Console email provider.
 *
 * Prints the rendered message to the terminal. Development only: it never
 * contacts the network, so what you see in the terminal is exactly what the
 * Resend provider would deliver, byte for byte.
 *
 * Addresses appear because this is a development convenience and the local data
 * is test data. Nothing else in the codebase logs personal data, and this
 * provider is not reachable in production — `env.validateEnv` requires a real
 * RESEND_API_KEY there.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',

  async send(message: EmailMessage) {
    console.info(
      [
        '',
        '[email:console]',
        `to=${message.to}`,
        `subject=${message.subject}`,
        ...(message.headers ? [Object.entries(message.headers).map(([k, v]) => `${k}: ${v}`)] : []),
        '',
        message.text,
        '',
      ].join('\n'),
    );
  },
};
