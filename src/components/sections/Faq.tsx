'use client';

import { useId, useState } from 'react';
import { FAQ } from '@/content/site';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S8 FAQ.
 *
 * A button plus a region, with `aria-expanded` and `aria-controls`. The height
 * animates with the grid-rows technique, so no fixed pixel height is guessed.
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
            {FAQ.map((item, index) => {
              const isOpen = open === index;
              const buttonId = `${baseId}-q${index}`;
              const panelId = `${baseId}-a${index}`;

              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-lg border-2 border-dusk bg-indigo/70"
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-lg font-bold text-cream transition-colors hover:bg-dusk/40"
                    >
                      {item.q}
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-2xl text-zzz transition-transform duration-300 motion-reduce:transform-none ${isOpen ? 'rotate-45' : ''}`}
                      >
                        +
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-body-md text-lavender">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}