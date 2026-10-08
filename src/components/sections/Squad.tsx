import Image from 'next/image';
import { ROUNDS, SQUAD } from '@/content/site';
import { asset } from '@/lib/assets';
import { HeartStrip } from '@/components/ui/HeartStrip';
import { RoundsReplay } from './RoundsReplay';
import { SectionHeading } from './SectionHeading';

/**
 * S4 Wake-up squad.
 *
 * The only fully opaque section: a dawn-orange backdrop so the three rounds
 * read as a bright interruption in the night. The replay control is a client
 * island; everything here is server-rendered.
 */
export function Squad() {
  const tilts = ['-rotate-3', 'rotate-1', 'rotate-3'] as const;
  const accent = ['bg-zzz', 'bg-pillow', 'bg-mint'] as const;

  return (
    <section
      id="squad"
      aria-labelledby="squad-heading"
      className="section-shell overflow-hidden bg-linear-to-b from-dawn via-zzz to-dawn text-ink"
    >
      <div className="content-frame relative z-10">
        <SectionHeading
          title={SQUAD.heading}
          sub={`${SQUAD.sub} ${SQUAD.body}`}
          as="h2"
        />

        <ul
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3"
          data-testid="squad-rounds"
        >
          {ROUNDS.map((round, index) => {
            const image = asset(round.asset);

            return (
              <li
                key={round.title}
                className={`flex flex-col overflow-hidden rounded-lg border-[3px] border-ink bg-cream [box-shadow:10px_10px_0_var(--color-pillow)] ${tilts[index]}`}
              >
                <div className="relative aspect-4/3 w-full overflow-hidden bg-midnight">
                  {image.exists ? (
                    <Image
                      src={image.src}
                      alt={round.alt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-full"
                      style={{
                        background: 'radial-gradient(70% 70% at 50% 35%, #3A2C78, #0B0620)',
                      }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute left-3 top-3 rounded-md px-2 py-1 font-mono text-xs font-bold text-ink ${accent[index]}`}
                  >
                    ROUND {index + 1}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h3 className="text-headline-sm font-display font-bold text-ink">
                    {round.title}
                  </h3>
                  <p className="text-body-sm text-ink/80">{round.body}</p>
                  <div className="mt-auto pt-4">
                    <HeartStrip label={SQUAD.stripLabel} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-12 flex justify-center">
          <RoundsReplay />
        </div>
      </div>
    </section>
  );
}