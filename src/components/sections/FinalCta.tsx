import { FINAL_CTA, HERO } from '@/content/site';
import { FullBleedImage } from '@/components/media/FullBleedImage';
import { StickerButton } from '@/components/ui/StickerButton';
import { SectionScrim } from './SectionScrim';

/**
 * S9 Final CTA.
 *
 * Dawn. The sunrise and ringing alarm clock live in the 3D scene behind this,
 * so the DOM here stays quiet and just carries the ask.
 */
export function FinalCta() {
  return (
    <section id="cta" aria-labelledby="cta-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <FullBleedImage
        assetKey="cta-backdrop"
        alt=""
        overlay="bottom"
        className="opacity-70"
      />

      <div className="content-frame relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="cta-heading"
            className="font-display text-display-hero-mobile font-black uppercase tracking-tight text-cream sm:text-5xl sm:leading-[52px]"
          >
            {FINAL_CTA.heading}
          </h2>
          <p className="mx-auto mt-5 text-body-lg text-lavender">{FINAL_CTA.note}</p>
          <div className="mt-8 flex justify-center">
            <StickerButton href="#reserve" size="lg" data-testid="cta-cta">
              {HERO.cta}
            </StickerButton>
          </div>
        </div>
      </div>
    </section>
  );
}