'use client';

import { useId, useState } from 'react';
import { PUBLISHED_FAQ } from '@/content/site';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S8 FAQ.
 *
 * A button plus a region, with `aria-expanded` and `aria-controls`. The height
 * animates with the grid-rows technique, so no fixed pixel height is guessed.
 *
 * Only `published` questions render. The safety, medical and biometric-data
 * answers are drafted in `site.ts` so the client can review the wording, but
 * they stay hidden until NEXT_PUBLIC_SAFETY_FAQ_APPROVED=true: publishing an
 * unapproved promise about hearing protection or heart-rate data is worse than
 * publishing nothing.
 */
export function Faq() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <div className="mx-auto max-w-3xl">
          <SectionHeading title="Frequently asked questions" as="h2" />

          <div className="mt-10 space-y-3">
            {PUBLISHED_FAQ.map((item, index) => {
              const isOpen = open === index;
              const buttonId = `${baseId}-q${index}`;
              const panelId = `${baseId}-a${index}`;

              return (
                <Card key={item.q} className="overflow-hidden">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-lg font-bold uppercase tracking-wide text-paper transition-colors duration-200 hover:bg-white/[0.03]"
                    >
                      {item.q}
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-xl font-light text-tungsten transition-transform duration-300 motion-reduce:transform-none ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                      >
                        +
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-base leading-relaxed text-mist">{item.a}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-mist/60">
            Full terms are in the{' '}
            <a href="/rules" className="text-paper underline decoration-tungsten/40 underline-offset-4">
              official rules
            </a>
            , the{' '}
            <a href="/refund" className="text-paper underline decoration-tungsten/40 underline-offset-4">
              refund policy
            </a>{' '}
            and the{' '}
            <a href="/privacy" className="text-paper underline decoration-tungsten/40 underline-offset-4">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}