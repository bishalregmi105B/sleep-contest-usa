import Link from 'next/link';
import {
  CONTACT_EMAIL_FALLBACK,
  FOOTER,
  SITE,
  contactHref,
  hasEmail,
} from '@/content/site';

/**
 * Copyright year.
 *
 * Resolved once at module load so the page stays prerenderable: reading the
 * clock during render is an unstable value under Cache Components, and the year
 * cannot change while the server is running.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Site footer.
 *
 * The contact address falls back to a generic link when the client has not
 * supplied one, so no literal placeholder is ever shown in production.
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t-2 border-dusk bg-midnight/90 py-14">
      <div className="content-frame">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-lg font-black uppercase text-cream">
              {SITE.name}
            </p>
            <p className="mt-3 text-body-sm text-lavender">{FOOTER.blurb}</p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-mint">
              {FOOTER.contact}
            </h2>
            <a
              href={contactHref}
              className="text-body-sm text-lavender underline decoration-dusk underline-offset-4 transition-colors hover:text-zzz"
            >
              {hasEmail ? SITE.email : CONTACT_EMAIL_FALLBACK}
            </a>
          </div>

          <nav aria-label="Legal" className="flex flex-col gap-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-mint">
              More
            </h2>
            <ul className="flex flex-col gap-2">
              {FOOTER.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-sm text-lavender underline decoration-dusk underline-offset-4 transition-colors hover:text-zzz"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-dusk pt-6 font-mono text-xs text-lavender/60">
          © {COPYRIGHT_YEAR} {SITE.organizer}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}