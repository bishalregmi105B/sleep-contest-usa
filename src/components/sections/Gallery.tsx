import Image from 'next/image';
import { GALLERY, GALLERY_TILES } from '@/content/site';
import { asset } from '@/lib/assets';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S6 Gallery.
 *
 * Honest about being pre-event: this is concept art, and every tile says so.
 * Tile sizes vary so the grid does not read as a template of identical cards.
 */
export function Gallery() {
  // Tiles exactly on a 3-column grid: one large tile fills a 2x2 block, the
  // five others fill the remaining cells, giving three full rows with no gaps.
  const spans = ['sm:col-span-2 sm:row-span-2', '', '', '', '', ''] as const;

  return (
    <section id="gallery" aria-labelledby="gallery-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading title={GALLERY.heading} sub={GALLERY.sub} as="h2" />

        <div className="mt-12 grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-3">
          {GALLERY_TILES.map((tile, index) => {
            const image = asset(tile.asset);

            return (
              <figure
                key={tile.key}
                className={`group relative overflow-hidden rounded-lg border-2 border-dusk [box-shadow:var(--shadow-card)] ${spans[index] ?? ''}`}
              >
                <div className="absolute inset-0 bg-indigo">
                  {image.exists ? (
                    <Image
                      src={image.src}
                      alt={tile.alt}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      loading="lazy"
                      className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-full"
                      style={{
                        background: 'radial-gradient(80% 70% at 50% 30%, #3A2C78, #0B0620)',
                      }}
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-midnight/90 via-transparent to-transparent"
                  />
                </div>

                <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-4">
                  <span className="text-body-sm font-bold text-cream">{tile.title}</span>
                  <span className="rounded-sm border border-lavender/40 px-2 py-0.5 font-mono text-[10px] uppercase text-lavender">
                    {GALLERY.conceptCaption}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}