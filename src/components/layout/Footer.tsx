import Link from 'next/link';
import {
  CONTACT_EMAIL,
  FOOTER,
  SITE,
  SOCIAL_LINKS,
  contactHref,
  hasAddress,
  hasPhone,
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
 * The identity block is the trust anchor of the whole page: a named organizer,
 * a real contact, and rules, refund and privacy one click away. Every line that
 * the client has not supplied yet is hidden rather than rendered as a blank or
 * a placeholder, so production never shows a square bracket.
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-ink/70 py-16 backdrop-blur-sm">
      <div className="content-frame">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Identity */}
          <div className="max-w-sm">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-paper">
              {SITE.name}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mist">{FOOTER.blurb}</p>
            {hasAddress ? (
              <address className="mt-3 text-sm not-italic text-mist/80">{SITE.address}</address>
            ) : null}
          </div>

          {/* Contact */}
          <div>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist/75">
              {FOOTER.contact}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                {contactHref ? (
                  <a
                    href={contactHref}
                    className="text-sm text-mist underline decoration-white/20 underline-offset-4 transition-colors hover:text-tungsten"
                  >
                    {SITE.email}
                  </a>
                ) : (
                  <span className="text-sm text-mist">{CONTACT_EMAIL}</span>
                )}
              </li>
              {hasPhone ? (
                <li>
                  <a
                    href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}
                    className="text-sm text-mist underline decoration-white/20 underline-offset-4 transition-colors hover:text-tungsten"
                  >
                    {SITE.phone}
                  </a>
                </li>
              ) : null}
            </ul>

            {SOCIAL_LINKS.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-4">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-mist/80 underline decoration-white/15 underline-offset-4 transition-colors hover:text-tungsten"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Legal */}
          <nav aria-label="Legal">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist/75">
              {FOOTER.legal}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {FOOTER.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mist underline decoration-white/20 underline-offset-4 transition-colors hover:text-tungsten"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-mist/75">
            © {COPYRIGHT_YEAR} {SITE.organizer}. All rights reserved.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-mist/75">{FOOTER.conceptNote}</p>
        </div>
      </div>
    </footer>
  );
}