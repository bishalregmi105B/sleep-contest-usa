'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ERROR_PAGE, SITE } from '@/content/site';
import { Button } from '@/components/ui/Button';

/**
 * Route-level error boundary.
 *
 * Shows a recoverable state rather than a stack trace, and logs only the digest
 * so nothing personal reaches the console.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route] render error, digest:', error.digest ?? 'none');
  }, [error]);

  return (
    <main
      id="main"
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-ink px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          backgroundImage:
            'radial-gradient(70% 50% at 50% 100%, rgba(255,184,103,0.10) 0%, transparent 70%), linear-gradient(to top, #1B1450 0%, #0B0620 45%, #07060F 100%)',
        }}
      />

      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold uppercase leading-none text-paper">
        {ERROR_PAGE.title}
      </h1>
      <p className="max-w-md text-lg leading-relaxed text-mist">{ERROR_PAGE.body}</p>

      {error.digest ? (
        <p className="font-mono text-xs text-mist/75">Reference: {error.digest}</p>
      ) : null}

      <Button onClick={reset} className="mt-2">
        {ERROR_PAGE.retry}
      </Button>

      <p className="mt-4 text-sm text-mist/75">
        <Link href="/" className="underline decoration-white/20 underline-offset-4 hover:text-tungsten">
          Back to {SITE.name}
        </Link>
      </p>
    </main>
  );
}