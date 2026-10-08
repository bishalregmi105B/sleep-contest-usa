'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { SITE } from '@/content/site';

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
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-midnight px-4 text-center"
    >
      <span aria-hidden="true" className="text-6xl">
        💤
      </span>

      <h1 className="font-display text-headline-lg-mobile font-black uppercase text-cream sm:text-headline-lg">
        Something woke us up
      </h1>
      <p className="max-w-md text-body-lg text-lavender">
        That did not work. Try again, and if it keeps happening the mat is still
        open.
      </p>

      {error.digest ? (
        <p className="font-mono text-xs text-lavender/60">
          Reference: {error.digest}
        </p>
      ) : null}

      <button type="button" onClick={reset} className="sticker-btn">
        Try again
      </button>

      <p className="mt-6 text-body-sm text-lavender/70">
        <Link href="/" className="underline underline-offset-4 hover:text-zzz">
          Back to {SITE.name}
        </Link>
      </p>
    </main>
  );
}