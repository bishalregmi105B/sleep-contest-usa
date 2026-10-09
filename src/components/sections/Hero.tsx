import { GRAND_PRIZE, HERO, SITE, plain, usd } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';
import { Suspense } from 'react';
import { GwrSlot } from '@/components/gwr/GwrSlot';

/**
 * The hero.
 *
 * Title-card layout in the lower-left third, over the cinematic sky. The
 * headline enters once at load like a title card — fade, a slight blur-in, and
 * the letter-spacing settling — and nothing on the page auto-plays after it.
 *
 * The prize plaque is a hairline card rather than a tilted sticker, and the
 * prize numeral uses the foil gradient, which is reserved for money and nothing
 * else on the site.
 */
export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="section-shell overflow-hidden"
    >
      {/* A directional scrim that preserves crystal-clear text contrast on the left
          while letting the stadium lights and pajama crowd shine through cleanly on the right. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/60 via-45% to-transparent"
      />

      <div className="content-frame relative z-10">
        <div className="max-w-3xl">
          <p className="reveal font-mono text-xs uppercase tracking-[0.2em] text-tungsten font-semibold">
            {SITE.name}
          </p>

          <h1
            id="hero-heading"
            className="reveal mt-5 font-display text-[clamp(3.1rem,8.5vw,7.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.01em] text-paper [animation-delay:120ms]"
            style={{ animationDelay: '120ms' }}
          >
            Can you sleep through{' '}
            <span className="text-tungsten drop-shadow-[0_0_36px_rgba(255,184,103,0.38)]">
              anything?
            </span>
          </h1>

          {/* Mobile & Tablet Grand Prize Banner: Ensures mobile visitors immediately see the $100,000 cash hook */}
          <div className="reveal mt-6 lg:hidden" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3.5 rounded-card border border-tungsten/30 bg-ink/80 px-4 py-3 backdrop-blur-md shadow-[0_0_28px_-6px_rgba(245,215,122,0.22)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tungsten/15 text-tungsten border border-tungsten/30">
                <span className="font-display text-lg font-black">$</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-tungsten font-bold">
                    {HERO.badgeCaption}
                  </span>
                  <span className="text-foil font-display text-3xl font-black tabular-nums">
                    {usd(GRAND_PRIZE)}
                  </span>
                </div>
                <p className="font-mono text-xs text-paper/90 truncate">
                  {plain(SITE.goal)} sleepers needed to unlock date
                </p>
              </div>
            </div>
          </div>

          <p
            className="reveal mt-6 max-w-xl text-lg leading-relaxed text-mist"
            style={{ animationDelay: '260ms' }}
          >
            {HERO.sub}
          </p>

          <div
            className="reveal mt-8 flex flex-wrap items-center gap-4"
            style={{ animationDelay: '400ms' }}
          >
            <ButtonLink href="#reserve" event={RESERVE_CLICK} size="lg" data-testid="hero-cta">
              {HERO.cta}
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg">
              {HERO.secondaryCta}
            </ButtonLink>
          </div>

          <div
            className="reveal mt-5 space-y-1.5"
            style={{ animationDelay: '520ms' }}
          >
            <p className="font-mono text-xs sm:text-sm font-semibold text-paper">
              {HERO.priceLine}
            </p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-mint">
              <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
              100% refundable if date doesn&apos;t suit or goal not reached
            </p>
          </div>
        </div>
      </div>

      {/* The prize plaque (Desktop). Prominent, glowing, and impossible to miss. */}
      <div className="content-frame pointer-events-none absolute inset-x-0 top-24 z-10 hidden lg:block">
        <div className="flex justify-end">
          <div className="rounded-card border border-tungsten/35 bg-ink/80 p-6 text-right backdrop-blur-md shadow-[0_0_48px_-10px_rgba(245,215,122,0.25),var(--shadow-raised)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-tungsten/30 bg-tungsten/10 px-3 py-1">
              <span className="size-1.5 rounded-full bg-tungsten animate-pulse" />
              <p className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-tungsten">
                {HERO.badgeCaption}
              </p>
            </div>
            <p className="text-foil mt-2 font-display text-6xl font-black leading-none tabular-nums drop-shadow-[0_2px_16px_rgba(245,215,122,0.25)]">
              {usd(GRAND_PRIZE)}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="font-mono text-xs font-semibold text-paper">
                {plain(SITE.goal)} sleepers needed
              </span>
              <span className="text-tungsten/60 text-xs">/</span>
              <span className="font-mono text-xs text-mist">to set date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record-attempt badge, beside the prize plaque. Renders nothing when
          the setting is off, and the badge itself renders nothing without the
          asset. */}
      <div className="content-frame absolute inset-x-0 bottom-20 z-10 flex justify-center">
        {/* Suspense so this stays a stream rather than forcing the surrounding
            page to become request-time: the badge reads settings, and the rest
            of the hero does not need to wait for it. */}
        <Suspense fallback={null}>
          <GwrSlot />
        </Suspense>
      </div>

      {/* The honesty label. Every image on this site is illustrative */}
      <p className="content-frame absolute inset-x-0 bottom-6 z-10 font-mono text-xs uppercase tracking-[0.18em] text-mist/60 font-medium">
        Concept visuals
      </p>
    </section>
  );
}