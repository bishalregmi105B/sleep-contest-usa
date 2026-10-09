'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TICKET } from '@/content/site';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SHARE_CLICK, track } from '@/lib/analytics';
import { HeartStrip } from './HeartStrip';
import { Timeline } from '@/components/sections/Timeline';

/**
 * A printed boarding pass.
 *
 * Paper-coloured, perforated, and quiet. The previous version was a cream
 * sticker card with a 12px pink offset shadow that flipped in; confetti was
 * removed earlier and never came back.
 *
 * The URL carries an unguessable publicId, never the sequential database id,
 * so one entrant cannot walk the numbering and read another's name.
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
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = cardRef.current;
    if (!card) return;

    // A single quiet slide-in. No flip, no confetti, no bounce.
    card.animate(
      [
        { transform: 'translate3d(0, 14px, 0)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
    );
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  }, [referralUrl]);

  const share = useCallback(async () => {
    track(SHARE_CLICK);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "The Great America's Sleep Contest",
          text: 'I just reserved a mat. Use my link to grab yours.',
          url: referralUrl,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await copy();
  }, [copy, referralUrl]);

  return (
    <div className="w-full">
      <div
        ref={cardRef}
        data-ticket
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[14px] bg-paper text-ink shadow-[var(--shadow-raised)]"
        data-testid="ticket"
      >
        {/* Subtle paper tooth, so the card is not a flat colour block. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23p)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative p-8 pb-7">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/65">
            {TICKET.title}
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none tracking-[-0.01em]">
            {firstName}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/70">{TICKET.sub}</p>
          <p className="mt-4 inline-block border border-ink/25 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-ink/80 font-medium">
            {TICKET.admitOne}
          </p>
        </div>

        {/* Perforation: a dashed rule with two notches cut out of it. */}
        <div aria-hidden="true" className="relative border-t-2 border-dashed border-ink/20">
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-ink" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-ink" />
        </div>

        <div className="relative grid grid-cols-2 gap-6 bg-ink/[0.05] px-8 py-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink/65">
              {TICKET.matLabel}
            </p>
            <p
              className="mt-1 font-mono text-3xl font-bold tabular-nums"
              data-testid="mat-number"
              data-numeric
            >
              {matNumber.toLocaleString('en-US').padStart(6, '0')}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink/65">
              Your code
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.14em]">{refCode}</p>
          </div>
        </div>

        <div className="relative px-8 py-5">
          <HeartStrip beats={7} />
          {/* A decorative barcode. aria-hidden: it encodes nothing. */}
          <div
            aria-hidden="true"
            className="mt-4 h-9 w-full opacity-70"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #07060F 0px, #07060F 2px, transparent 2px, transparent 4px, #07060F 4px, #07060F 5px, transparent 5px, transparent 9px, #07060F 9px, #07060F 12px, transparent 12px, transparent 14px)',
            }}
          />
        </div>
      </div>

      {/* Referral. The confirmation page is the proven place to ask. */}
      <section className="mx-auto mt-10 w-full max-w-xl">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-paper">
          {TICKET.referralHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">{TICKET.referralBody}</p>

        <div className="panel mt-4 flex flex-col gap-4 p-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-tungsten font-semibold">
              {TICKET.yourLink}
            </p>
            <p className="mt-1 break-all font-mono text-sm text-paper">{referralUrl}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={referralUrl} target="_blank" rel="noopener noreferrer" size="sm">
              {TICKET.share}
            </ButtonLink>
            <Button onClick={share} variant="secondary" size="sm" data-testid="ticket-copy">
              {TICKET.copyLink}
            </Button>
            <a
              href={`mailto:?subject=${encodeURIComponent("I'm in the Sleep Contest")}&body=${encodeURIComponent(
                `I just reserved a mat in the Great America's Sleep Contest. Use my link to grab yours: ${referralUrl}`,
              )}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 py-2 text-sm font-bold uppercase tracking-wide text-mist transition-colors duration-200 hover:bg-white/5 hover:text-paper"
            >
              {TICKET.emailCta}
            </a>
          </div>

          <p role="status" aria-live="polite" className="min-h-5 font-mono text-xs text-mint">
            {copied ? TICKET.linkCopied : ''}
          </p>
        </div>
      </section>

      {/* What happens next, so nobody has to guess after paying. */}
      <section className="mx-auto mt-10 w-full max-w-xl">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-paper">
          {TICKET.nextHeading}
        </h2>
        <div className="mt-4">
          <Timeline heading={false} />
        </div>
      </section>

      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-mist/75 no-print">
        {TICKET.noCalendar}
      </p>

      {/* Calendar is deliberately absent until there is a date to add. */}
    </div>
  );
}