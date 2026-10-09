import { resendEnabled } from '@/lib/env';
import { consoleProvider } from './console';
import { resendProvider } from './resend';
import type { EmailProvider } from './index';

/**
 * Chooses the transport.
 *
 * Falls back to console when Resend is not configured. In production that is a
 * misconfiguration the startup check refuses to start through; if it somehow
 * happens, messages accumulate in the outbox and the admin health card shows a
 * red "email not configured" warning rather than the site pretending they were
 * sent.
 */
export function emailProvider(): EmailProvider {
  return resendEnabled ? resendProvider : consoleProvider;
}
