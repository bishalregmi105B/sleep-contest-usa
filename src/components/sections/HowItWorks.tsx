import { HOW, STEPS } from '@/content/site';
import { Plate } from '@/components/media/Plate';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S3 How it works.
 *
 * Four editorial columns. The number is a mono numeral on the photograph and
 * the heading carries no "Step N:" prefix: the old build showed both, which is
 * two devices competing for one job.
 */
export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading title={HOW.heading} sub={HOW.sub} as="h2" />

        <ol
          className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="how-steps"
        >
          {STEPS.map((step, index) => {
            const number = String(index + 1).padStart(2, '0');

            return (
              <li key={step.title} className="group flex flex-col">
                <figure className="relative overflow-hidden rounded-t-[12px] border border-b-0 border-white/10">
                  <Plate
                    assetKey={step.asset}
                    alt={step.alt}
                    className="aspect-3/2 w-full"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    caption={number}
                  />
                </figure>

                <div className="panel flex flex-1 flex-col gap-2 rounded-t-none p-5">
                  <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-wide text-paper">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-mist">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}