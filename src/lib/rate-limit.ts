/**
 * In-memory token bucket rate limiting, keyed by IP.
 *
 * This is per-instance and resets on restart, which is fine for a single Node
 * process. Production should use Redis (or the platform's rate limiter) so the
 * limit holds across instances; see BUILD_REPORT.md.
 */

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();

/** Keep the map from growing without bound on a long-running process. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > REFILL_MS * 4) buckets.delete(key);
  }
}

const REFILL_MS = 60_000;

export type RateLimitOptions = {
  /** Sustained rate, in tokens per minute. */
  readonly perMinute: number;
  /** Bucket size, which also caps the burst. */
  readonly burst: number;
};

/**
 * Consumes one token. Returns true when the request is allowed.
 */
export function rateLimit(key: string, { perMinute, burst }: RateLimitOptions): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { tokens: burst, updatedAt: now };

  const refill = ((now - bucket.updatedAt) / REFILL_MS) * perMinute;
  bucket.tokens = Math.min(burst, bucket.tokens + refill);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Test seam: clears all buckets between Playwright runs. */
export function resetRateLimits(): void {
  buckets.clear();
}