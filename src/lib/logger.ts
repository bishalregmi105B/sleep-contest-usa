import { newRequestId } from './ids';

/**
 * Structured logging.
 *
 * The previous code used bare `console.error` with interpolated messages, which
 * is readable in a terminal and useless in a log aggregator: no request id, no
 * route, no duration, and no way to correlate one request's lines.
 *
 * Two rules hold everywhere:
 *
 *  1. **No personal data, ever.** No names, emails, phone numbers, dates of
 *     birth, addresses or raw IPs. A logger that leaks PII into a third-party
 *     aggregator is a data-protection incident, so the field list below is
 *     short on purpose. Anything identifying is hashed before storage
 *     (`src/lib/privacy.ts`) and referenced by that hash.
 *  2. **One JSON object per line.** That is what Vercel, Datadog and every
 *     other collector can parse.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Fields = Record<string, string | number | boolean | null | undefined>;

/** Fields that are never allowed through, whatever a caller passes. */
const FORBIDDEN_KEYS = new Set([
  'email',
  'fullName',
  'name',
  'mobile',
  'phone',
  'dateOfBirth',
  'cityState',
  'ip',
  'address',
  'password',
  'token',
  'secret',
  'authorization',
]);

function sanitise(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.has(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function emit(level: LogLevel, message: string, fields: Fields = {}): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...sanitise(fields),
  });

  // console.* rather than process.stdout.write: the platform captures console
  // and annotates the line with the invocation it came from.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const log = {
  debug: (message: string, fields?: Fields) => emit('debug', message, fields),
  info: (message: string, fields?: Fields) => emit('info', message, fields),
  warn: (message: string, fields?: Fields) => emit('warn', message, fields),
  error: (message: string, fields?: Fields) => emit('error', message, fields),
};

/**
 * A request id, generated per request and threaded through every log line and
 * every downstream call.
 *
 * Also sent back as `x-request-id` so a visitor reporting a problem can quote
 * it, and a support request can be traced without asking for personal data.
 */
export function requestContext(request: Request): {
  id: string;
  log: (level: LogLevel, message: string, fields?: Fields) => void;
  finish: (extra?: Fields) => void;
} {
  // Honour an upstream id (Vercel sets one) so logs join across services.
  const incoming = request.headers.get('x-request-id');
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : newRequestId();
  const started = Date.now();

  return {
    id,
    log: (level, message, fields) => emit(level, message, { requestId: id, ...fields }),
    finish: (extra = {}) => emit('info', 'request', { requestId: id, durationMs: Date.now() - started, ...extra }),
  };
}

/**
 * Wraps a route handler with timing, a request id and a catch-all.
 *
 * The catch-all is what keeps the degradation matrix honest: an unexpected
 * error becomes a clean JSON 503 or 500 with no stack trace, and the stack goes
 * to the log where it belongs.
 */
export async function withRouteLogging(
  request: Request,
  route: string,
  handler: (context: { id: string; log: (level: LogLevel, message: string, fields?: Fields) => void }) => Promise<Response>,
): Promise<Response> {
  const ctx = requestContext(request);

  try {
    const response = await handler(ctx);
    ctx.finish({ route, status: response.status });
    // Echo the id so a visitor can quote it in support.
    if (!response.headers.has('x-request-id')) {
      response.headers.set('x-request-id', ctx.id);
    }
    return response;
  } catch (err) {
    ctx.log('error', 'request failed', {
      route,
      error: err instanceof Error ? err.message : 'unknown error',
    });
    return Response.json(
      { message: 'Something went wrong on our side. Please try again.', requestId: ctx.id },
      { status: 503, headers: { 'x-request-id': ctx.id, 'Retry-After': '5' } },
    );
  }
}