/**
 * Email provider interface.
 *
 * `console` is the default and never contacts the network, so confirmation
 * emails are visible in the terminal during development without any keys.
 * `resend` takes over when RESEND_API_KEY and EMAIL_FROM are both set.
 */

export type ConfirmationEmail = {
  readonly to: string;
  readonly firstName: string;
  readonly matNumber: number;
  readonly ticketUrl: string;
  readonly refundNote: string;
};

export interface EmailProvider {
  readonly name: 'console' | 'resend';
  sendConfirmation(email: ConfirmationEmail): Promise<void>;
}