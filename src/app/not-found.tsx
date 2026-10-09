import Link from 'next/link';
import { NOT_FOUND, SITE } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';

/**
 * 404. Written as a server component with no client JS: an error page should
 * not be the heaviest thing on the site.
 */
export default function NotFound() {
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

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist/50">404</p>

      <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-extrabold uppercase leading-none text-paper">
        {NOT_FOUND.title}
      </h1>
      <p className="max-w-md text-lg leading-relaxed text-mist">{NOT_FOUND.body}</p>

      <ButtonLink href="/" className="mt-2">
        {NOT_FOUND.cta}
      </ButtonLink>

      <nav aria-label="Contest terms" className="mt-4 flex flex-wrap justify-center gap-5">
        <Link href="/rules" className="text-sm text-mist/70 underline decoration-white/20 underline-offset-4 hover:text-tungsten">
          Contest rules
        </Link>
        <Link href="/privacy" className="text-sm text-mist/70 underline decoration-white/20 underline-offset-4 hover:text-tungsten">
          Privacy
        </Link>
        <Link href="/refund" className="text-sm text-mist/70 underline decoration-white/20 underline-offset-4 hover:text-tungsten">
          Refunds
        </Link>
      </nav>

      <span className="sr-only">{SITE.name}</span>
    </main>
  );
}