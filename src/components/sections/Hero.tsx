import { GRAND_PRIZE, HERO, SITE, plain, usd } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';

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
      {/* A directional scrim so the type always clears whatever is behind it,
          including the sunrise the stage shows at this scroll position. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/45 to-transparent"
      />

      <div className="content-frame relative z-10">
        <div className="max-w-3xl">
          <p className="reveal font-mono text-xs uppercase tracking-[0.2em] text-tungsten/80">
            {SITE.name}
          </p>

          <h1
            id="hero-heading"
            className="reveal mt-5 font-display text-[clamp(3rem,8.5vw,7.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.01em] text-paper [animation-delay:120ms]"
            style={{ animationDelay: '120ms' }}
          >
            {HERO.h1}
          </h1>

          <p
            className="reveal mt-6 max-w-xl text-lg leading-relaxed text-mist"
            style={{ animationDelay: '260ms' }}
          >
            {HERO.sub}
          </p>

          <div
            className="reveal mt-9 flex flex-wrap items-center gap-4"
            style={{ animationDelay: '400ms' }}
          >
            <ButtonLink href="#reserve" event={RESERVE_CLICK} size="lg" data-testid="hero-cta">
              {HERO.cta}
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg">
              {HERO.secondaryCta}
            </ButtonLink>
          </div>

          <p
            className="reveal mt-6 font-mono text-sm text-mist/70"
            style={{ animationDelay: '520ms' }}
          >
            {HERO.priceLine}
          </p>
        </div>
      </div>

      {/* The prize plaque. A hairline card, square to the page. */}
      <div className="content-frame pointer-events-none absolute inset-x-0 top-28 z-10 hidden lg:block">
        <div className="flex justify-end">
          <div className="panel px-7 py-5 text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist/75">
              {HERO.badgeCaption}
            </p>
            <p className="text-foil mt-1 font-display text-5xl font-extrabold leading-none tabular-nums">
              {usd(GRAND_PRIZE)}
            </p>
            <p className="mt-2 font-mono text-[11px] text-mist/75">
              {plain(SITE.goal)} sleepers needed
            </p>
          </div>
        </div>
      </div>

      {/* The honesty label. Every image on this site is illustrative, and the
          hero is where someone is most likely to assume otherwise. */}
      <p className="content-frame absolute inset-x-0 bottom-6 z-10 font-mono text-[10px] uppercase tracking-[0.18em] text-mist/35">
        Concept visuals
      </p>
    </section>
  );
}