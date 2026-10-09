/**
 * Registration write-path load test.
 *
 * Not autocannon, because this endpoint needs two things autocannon cannot do:
 *
 *  1. A unique email per request. The per-email rate limit would otherwise
 *     reject everything after the first five, and the test would measure the
 *     rate limiter instead of the write path.
 *  2. A distinct X-Forwarded-For per request, for the same reason against the
 *     per-IP limit.
 *
 * That is not a way of dodging the limits — it is what real traffic looks like.
 * The rate limiter is verified separately in `ratelimit.js`; this script measures
 * what the database does when it is allowed to work.
 *
 * Usage: node loadtest/register.js [baseUrl] [concurrency] [durationSeconds]
 */

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const CONCURRENCY = Number(process.argv[3] || 100);
const DURATION_S = Number(process.argv[4] || 20);

let issued = 0;
let succeeded = 0;
let rateLimited = 0;
let otherErrors = 0;
const latencies = [];
let stop = false;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

async function worker() {
  while (!stop) {
    const n = issued++;
    const email = `load${n}@example.com`;
    const body = JSON.stringify({
      fullName: 'Load Test',
      email,
      mobile: '5125550134',
      dateOfBirth: '1990-01-01',
      cityState: 'Dallas, TX',
      consent: true,
    });

    const started = process.hrtime.bigint();
    try {
      const response = await fetch(`${BASE}/api/register`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`,
        },
        body,
      });
      const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
      latencies.push(elapsed);

      if (response.ok) succeeded += 1;
      else if (response.status === 429) rateLimited += 1;
      else otherErrors += 1;
    } catch {
      otherErrors += 1;
    }
  }
}

const main = async () => {
  console.log(
    `POST /api/register  concurrency=${CONCURRENCY}  duration=${DURATION_S}s  ` +
      `target=${BASE} (each request uses a unique IP and email, so rate limits do not mask the write path)`,
  );

  const started = Date.now();

  // Stop the workers on a timer. Setting the flag after `Promise.all` would
  // deadlock: the workers only resolve once `stop` is true, and `Promise.all`
  // only resolves once they are done.
  const timer = setTimeout(() => { stop = true; }, DURATION_S * 1000);

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const seconds = (Date.now() - started) / 1000;
  clearTimeout(timer);
  stop = true;

  const sorted = latencies.sort((a, b) => a - b);
  const total = succeeded + rateLimited + otherErrors;

  console.log(`
requests      ${total.toLocaleString('en-US')} in ${seconds.toFixed(1)}s (${(total / seconds).toFixed(0)}/s)
accepted      ${succeeded.toLocaleString('en-US')}
rate limited  ${rateLimited.toLocaleString('en-US')}
errors        ${otherErrors.toLocaleString('en-US')}
error rate    ${((otherErrors / Math.max(1, total)) * 100).toFixed(3)}%

latency ms    p50 ${percentile(sorted, 50).toFixed(0)}   p95 ${percentile(sorted, 95).toFixed(0)}   p99 ${percentile(sorted, 99).toFixed(0)}   max ${sorted[sorted.length - 1]?.toFixed(0) ?? 0}
`);
}

main();
