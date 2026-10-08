import Link from 'next/link';
import { NOT_FOUND, SITE } from '@/content/site';

/**
 * 404. Written as a server component with no client JS: an error page should
 * not be the heaviest thing on the site.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-midnight px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
        }}
      />

      <span aria-hidden="true" className="text-6xl">
        🌙
      </span>

      <h1 className="font-display text-headline-lg-mobile font-black uppercase text-cream sm:text-headline-lg">
        {NOT_FOUND.title}
      </h1>
      <p className="max-w-md text-body-lg text-lavender">{NOT_FOUND.body}</p>

      <Link href="/" className="sticker-btn">
        {NOT_FOUND.cta}
      </Link>

      <p className="mt-6 text-body-sm text-lavender/70">
        <Link href="/rules" className="underline underline-offset-4 hover:text-zzz">
          Contest rules
        </Link>
        {' · '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-zzz">
          Privacy
        </Link>
        {' · '}
        <Link href="/refund" className="underline underline-offset-4 hover:text-zzz">
          Refunds
        </Link>
      </p>

      <span className="sr-only">{SITE.name}</span>
    </main>
  );
}