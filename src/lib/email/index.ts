/**
 * Email provider interface.
 *
 * Two implementations: `console` (development only, never contacts the network)
 * and `resend` (used whenever RESEND_API_KEY and EMAIL_FROM are both set).
 *
 * The interface is a single `send` rather than one method per email type, so a
 * new template does not mean a new provider method. Rendering lives in
 * `templates.ts`; the provider only transports.
 */

export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  /**
   * Extra headers, e.g. `List-Unsubscribe` on anything that is not strictly
   * transactional. Required for bulk mail to avoid spam complaints, and
   * required by Gmail and Yahoo for senders at volume.
   */
  readonly headers?: Readonly<Record<string, string>>;
};

export interface EmailProvider {
  readonly name: 'console' | 'resend';

  /**
   * Sends one message. Must throw on failure.
   *
   * Throwing is how the outbox learns a message failed; a provider that
   * swallowed the error would mark undelivered mail as sent.
   */
  send(message: EmailMessage): Promise<void>;
}

export type { ConfirmationParams, RenderedEmail } from './templates';