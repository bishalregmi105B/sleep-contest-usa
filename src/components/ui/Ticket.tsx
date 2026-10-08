'use client';

import { useEffect, useRef } from 'react';
import { TICKET } from '@/content/site';
import { StickerButton } from '@/components/ui/StickerButton';
import { HeartStrip } from './HeartStrip';

/**
 * Boarding-pass ticket.
 *
 * Flips in once on load (A13), with confetti. The URL carries an unguessable
 * publicId, never the sequential database id, so one entrant cannot walk the
 * numbering and read another's name.
 */
export function Ticket({
  firstName,
  matNumber,
  refCode,
  referralUrl,
}: {
  readonly firstName: string;
  readonly matNumber: number;
  readonly refCode: string;
  readonly referralUrl: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const card = cardRef.current;
    if (!card) return;

    // A single flip-in, then the card sits still.
    card.animate(
      [
        { transform: 'perspective(1200px) rotateY(-22deg) translateZ(-60px)', opacity: 0 },
        { transform: 'perspective(1200px) rotateY(6deg) translateZ(20px)', opacity: 1, offset: 0.6 },
        { transform: 'perspective(1200px) rotateY(0deg) translateZ(0)', opacity: 1 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
    );
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative mx-auto w-full max-w-lg rounded-lg border-[3px] border-ink bg-cream text-ink [box-shadow:12px_12px_0_var(--color-pillow)]"
      data-testid="ticket"
    >
      {/* Perforation */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[38%] border-t-[3px] border-dashed border-ink/25"
      />

      <div className="p-8 pb-6">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          {TICKET.title}
        </p>
        <h1 className="mt-2 font-display text-display-hero-mobile font-black uppercase leading-none text-ink sm:text-5xl">
          {firstName}
        </h1>
        <p className="mt-3 text-body-sm text-ink/70">{TICKET.sub}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 bg-ink/[0.04] px-8 py-6">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
            {TICKET.matLabel}
          </p>
          <p
            className="font-mono text-3xl font-bold text-ink tabular-nums"
            data-testid="mat-number"
          >
            #{matNumber.toLocaleString('en-US')}
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
            Your code
          </p>
          <p className="font-mono text-3xl font-bold tracking-widest text-ink">{refCode}</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <HeartStrip />
      </div>

      <div className="flex flex-col gap-3 px-8 pb-8 sm:flex-row sm:items-center">
        <StickerButton href={referralUrl} target="_blank" rel="noopener noreferrer">
          {TICKET.share}
        </StickerButton>
        <a
          href={`mailto:?subject=${encodeURIComponent("I'm in the Sleep Contest")}&body=${encodeURIComponent(
            `I just reserved mat #${matNumber} in the Great America's Sleep Contest. Use my link to grab yours: ${referralUrl}`,
          )}`}
          className="inline-flex min-h-11 items-center justify-center rounded-pill border-2 border-dusk px-5 text-body-sm font-bold text-ink transition-colors hover:bg-ink/5"
        >
          {TICKET.emailCta}
        </a>
      </div>

      <p className="border-t-2 border-dashed border-ink/20 px-8 py-4 text-center text-body-sm text-ink/70">
        {TICKET.noCalendar}
      </p>
    </div>
  );
}