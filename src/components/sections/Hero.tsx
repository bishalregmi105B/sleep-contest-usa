import { HERO } from '@/content/site';
import { FullBleedImage } from '@/components/media/FullBleedImage';
import { StickerButton } from '@/components/ui/StickerButton';

/**
 * S1 Hero.
 *
 * The poster is the LCP element and doubles as the no-WebGL fallback, so it is
 * priority-loaded and sits underneath the fixed 3D scene rather than replacing
 * it.
 */
export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="section-shell overflow-hidden"
    >
      <FullBleedImage
        assetKey="hero-poster"
        alt="A sleeper in striped pajamas on a cloud mattress under a starry sky, with a smiling crescent moon in a nightcap and glowing Zzz balloons."
        priority
        overlay="none"
        data-hero-poster
      />

      {/* Darken the lower-left so the headline always clears the art. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-midnight/90 via-midnight/55 to-transparent"
      />

      <div className="content-frame relative z-10">
        <div className="max-w-2xl">
          <h1
            id="hero-heading"
            className="font-display text-display-hero-mobile font-black tracking-tight text-cream uppercase sm:text-display-hero sm:leading-[76px]"
          >
            {HERO.h1}
          </h1>

          <p className="mt-6 max-w-xl text-body-lg text-lavender sm:text-xl">
            {HERO.sub}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <StickerButton href="#reserve" size="lg" data-testid="hero-cta">
              {HERO.cta}
            </StickerButton>
            <StickerButton href="#how" variant="ghost">
              See how it works
            </StickerButton>
          </div>

          <p className="mt-6 font-mono text-sm text-lavender/90">{HERO.priceLine}</p>
        </div>
      </div>

      {/* Tilted prize badge. Positioned rather than centred so it never
          competes with the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-28 z-10 hidden -rotate-6 rounded-md bg-zzz px-6 py-3 font-display text-xl font-black text-ink [box-shadow:8px_8px_0_var(--color-pillow)] lg:block"
      >
        {HERO.badge}
      </div>
    </section>
  );
}