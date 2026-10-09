import { GALLERY, GALLERY_TILES, TIMELINE } from '@/content/site';
import { hasAsset } from '@/lib/assets';
import { Plate } from '@/components/media/Plate';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S6 Gallery.
 *
 * Two honest states, and which one renders is decided by whether the
 * photographs actually exist on disk.
 *
 * With images: the bento grid, every tile unique and labelled "Concept visual".
 *
 * Without images: a schedule of the night instead. An empty grid under the
 * heading "Concept visuals generated to show what the night could look like"
 * would be claiming photographs exist when none do, which is the one thing this
 * site must never do. The schedule is genuinely useful in its own right, and it
 * disappears the moment the real files are dropped into public/.
 */
export function Gallery() {
  const hasPhotos = GALLERY_TILES.some((tile) => hasAsset(tile.asset));

  return (
    <section id="gallery" aria-labelledby="gallery-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading
          title={GALLERY.heading}
          sub={hasPhotos ? GALLERY.subConcept : GALLERY.subNoPhotos}
          as="h2"
        />

        {hasPhotos ? <PhotoGrid /> : <TheNightSchedule />}
      </div>
    </section>
  );
}

function PhotoGrid() {
  // Tiles exactly on a 3-column grid: one large tile fills a 2x2 block, the
  // five others fill the remaining cells, giving three full rows with no gaps.
  const spans = ['sm:col-span-2 sm:row-span-2', '', '', '', '', ''] as const;

  return (
    <div className="mt-14 grid auto-rows-[210px] grid-cols-1 gap-4 sm:grid-cols-3">
      {GALLERY_TILES.map((tile, index) => (
        <figure
          key={tile.key}
          className={`group relative overflow-hidden rounded-[12px] border border-white/10 ${spans[index] ?? ''}`}
        >
          <Plate
            assetKey={tile.asset}
            alt={tile.alt}
            className="absolute inset-0 size-full transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none group-hover:scale-[1.03]"
            sizes="(min-width: 640px) 33vw, 100vw"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent"
          />

          <span className="absolute right-3 top-3 rounded-sm bg-ink/80 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.14em] text-mist font-medium backdrop-blur-md border border-white/10">
            {GALLERY.conceptCaption}
          </span>

          <figcaption className="absolute inset-x-0 bottom-0 p-4">
            <span className="text-sm font-medium text-paper">{tile.title}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * The night, hour by hour. Replaces the photo grid until there are photos to
 * show, and it earns its place: most visitors want to know what they are
 * committing to before they pay $10.
 */
function TheNightSchedule() {
  return (
    <div className="mx-auto mt-14 max-w-4xl">
      <Card className="p-7 sm:p-9">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-paper">
          The night, hour by hour
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
          One evening, one field, ninety minutes of trying to stay asleep. This is
          what you are reserving a place in.
        </p>

        <ol className="mt-7 divide-y divide-white/10">
          {TIMELINE.steps.map((step, index) => (
            <li key={step.title} className="flex gap-5 py-4 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20 font-mono text-xs font-semibold text-tungsten"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-paper">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-mist">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 text-center text-sm text-mist/75">
        Photography from the first event will appear here.
      </p>
    </div>
  );
}