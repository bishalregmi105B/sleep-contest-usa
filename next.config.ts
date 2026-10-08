import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * The CSP is delivered report-only at first: a strict policy that breaks the
 * WebGL worker or wasm pipeline in production is worse than a documented one
 * being monitored. Flip `enforce` once verified in the target environment.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts and inline styles.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  // three.js compiles shaders with workers and, for some geometries, wasm.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Geolocation, camera and microphone are not used; the event is filmed by
    // staff, not by entrant devices.
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;