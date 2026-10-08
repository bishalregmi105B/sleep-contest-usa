import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE } from '@/content/site';

/**
 * Shared layout for the legal drafts.
 *
 * These restate only the facts the client supplied. They are a starting point
 * for the client's promotions lawyer, not a legal document, and say so
 * prominently rather than in small print.
 */
export function LegalLayout({
  title,
  updated,
  sections,
}: {
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly { readonly id: string; readonly heading: string; readonly body: ReactNode }[];
}) {
  return (
    <main id="main" className="relative min-h-svh bg-midnight">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
        }}
      />

      <div className="content-frame relative z-10 py-20">
        <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[200px_1fr]">
          {/* Sticky table of contents */}
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="font-display text-2xl font-black uppercase text-cream">
              {title}
            </h1>
            <p className="mt-1 font-mono text-xs text-lavender/70">Updated {updated}</p>
            <ol className="mt-5 space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-body-sm text-lavender underline decoration-dusk underline-offset-4 hover:text-zzz"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="space-y-10">
            {/* Draft banner: visible in every environment outside production. */}
            <div className="rounded-lg border-2 border-zzz bg-zzz/10 p-5" role="note">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-zzz">
                Draft
              </p>
              <p className="mt-2 text-body-sm text-cream">
                This page is a draft written from the contest brief. It has not
                been reviewed by a lawyer and does not claim to be legally
                compliant. It needs review by the client&rsquo;s promotions
                lawyer before the contest goes live.
              </p>
            </div>

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-2xl font-bold text-cream">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-4 text-body-md text-lavender [&_a]:text-zzz [&_a]:underline [&_a]:decoration-dusk [&_a]:underline-offset-4">
                  {section.body}
                </div>
              </section>
            ))}

            <p className="border-t border-dusk pt-6 text-body-sm text-lavender/80">
              Organised by {SITE.organizer}. See the{' '}
              <Link href="/refund" className="underline underline-offset-4 hover:text-zzz">
                refund policy
              </Link>{' '}
              and the{' '}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-zzz">
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