import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL, SITE, contactHref, hasAddress, hasEmail } from '@/content/site';

/**
 * Shared layout for the legal drafts.
 *
 * A plain-language introduction, a table of contents and a visible last-updated
 * date, because on a paid-entry contest those three things are what a visitor
 * checks before handing over $39.99.
 *
 * The draft notice is not decoration. A paid entry with cash prizes and a result
 * driven by heart rate may be treated as a lottery in some US states, so the
 * page says plainly that it has not been through a lawyer.
 */
export function LegalLayout({
  title,
  intro,
  updated,
  sections,
}: {
  readonly title: string;
  /** One plain sentence on what this document is. */
  readonly intro: string;
  /** ISO date of the last substantive change. */
  readonly updated: string;
  readonly sections: readonly {
    readonly id: string;
    readonly heading: string;
    readonly body: ReactNode;
  }[];
}) {
  return (
    <main id="main" className="relative min-h-svh bg-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          backgroundImage:
            'radial-gradient(70% 50% at 50% 100%, rgba(255,184,103,0.08) 0%, transparent 70%), linear-gradient(to top, #1B1450 0%, #0B0620 45%, #07060F 100%)',
        }}
      />

      <div className="content-frame relative z-10 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="font-display text-3xl font-extrabold uppercase leading-none text-paper">
              {title}
            </h1>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-mist/75">
              Last updated {updated}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-mist">{intro}</p>

            <ol className="mt-7 space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-mist underline decoration-white/15 underline-offset-4 transition-colors hover:text-tungsten"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist/75">
                Contact
              </p>
              <p className="mt-2 text-sm text-mist">
                {contactHref ? (
                  <a href={contactHref} className="underline decoration-white/15 underline-offset-4 hover:text-tungsten">
                    {SITE.email}
                  </a>
                ) : (
                  CONTACT_EMAIL
                )}
              </p>
              {hasAddress ? (
                <address className="mt-2 text-sm not-italic text-mist/70">{SITE.address}</address>
              ) : null}
            </div>
          </nav>

          <article className="space-y-10">
            <div className="panel border-tungsten/30 p-5" role="note">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-tungsten">
                Needs lawyer review
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                This page is written from the contest brief, not from legal advice.
                A paid entry with cash prizes and a result decided by heart rate
                may be treated as a lottery in some US states, and whether a free
                alternative way to enter is required depends on the state. The
                client&rsquo;s promotions lawyer should review this page, the
                waiver and the paid-entry structure before the contest is
                announced.
              </p>
            </div>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-paper">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-4 text-base leading-relaxed text-mist [&_a]:text-tungsten [&_a]:underline [&_a]:decoration-white/15 [&_a]:underline-offset-4">
                  {section.body}
                </div>
              </section>
            ))}

            <p className="border-t border-white/10 pt-6 text-sm text-mist/70">
              Organised by {SITE.organizer}.{' '}
              {hasEmail ? null : <span>Email us at {CONTACT_EMAIL}. </span>}See the{' '}
              <Link href="/refund" className="underline underline-offset-4 hover:text-tungsten">
                refund policy
              </Link>{' '}
              and the{' '}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-tungsten">
                privacy policy
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}