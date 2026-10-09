import { env, turnstileEnabled } from './env';
import { log } from './logger';

/**
 * Cloudflare Turnstile.
 *
 * Env-gated: when the keys are absent the check is skipped entirely, so the
 * project builds and runs locally with no account. When they are present the
 * check is **enforced** — a request without a valid token is refused, because a
 * silently-skipped bot check on a paid form is worse than no bot check: it
 * looks like protection and is not.
 *
 * This is the second line of defence. The first is rate limiting; the third is
 * the honeypot. Turnstile exists because rate limiting alone is cheap to
 * work around with a distributed botnet.
 */

export { turnstileEnabled };

type TurnstileResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export async function verifyTurnstile(token: string, remoteip: string): Promise<boolean> {
  if (!turnstileEnabled) return true;

  if (!token) {
    log.warn('turnstile: token missing');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.turnstileSecretKey,
        response: token,
        // Omitted when the address is unknown; Turnstile treats it as optional.
        ...(remoteip && remoteip !== 'unknown' ? { remoteip } : {}),
      }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      // A Turnstile outage must not lock out real entrants, so an unreachable
      // verifier allows the request through. Rate limiting still applies.
      log.error('turnstile: siteverify unreachable', { status: response.status });
      return true;
    }

    const body = (await response.json()) as TurnstileResponse;
    if (!body.success) {
      log.warn('turnstile: rejected', { codes: (body['error-codes'] ?? []).join(',') });
    }
    return body.success;
  } catch (err) {
    log.error('turnstile: siteverify failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    return true;
  }
}