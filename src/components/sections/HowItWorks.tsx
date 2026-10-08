import Image from 'next/image';
import { STEPS } from '@/content/site';
import { asset } from '@/lib/assets';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * S3 How it works.
 *
 * A real four-step sequence, so the numbering carries meaning here (unlike the
 * eyebrow labels elsewhere). On desktop this becomes a pinned horizontal rail;
 * on mobile and with reduced motion it is a plain vertical stack.
 */
export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading
          title="How America’s deepest sleeper wins"
          sub={`Four steps from tonight to the cash. Our ${STEPS[2]?.title.toLowerCase()} is the easy part.`}
          as="h2"
        />

        <ol
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="how-steps"
        >
          {STEPS.map((step, index) => {
            const image = asset(step.asset);
            const number = String(index + 1).padStart(2, '0');

            return (
              <GlassCard
                as="li"
                key={step.title}
                className="flex flex-col overflow-hidden p-0"
              >
                <div className="relative aspect-16/10 w-full overflow-hidden bg-indigo">
                  {image.exists ? (
                    <Image
                      src={image.src}
                      alt={step.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-full"
                      style={{
                        background:
                          'radial-gradient(80% 70% at 50% 30%, #3A2C78, #0B0620)',
                      }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute left-3 top-3 rounded-md bg-zzz px-2 py-1 font-mono text-sm font-bold text-ink"
                  >
                    {number}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-headline-sm font-display font-bold text-cream">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="text-body-sm text-lavender">{step.body}</p>
                </div>
              </GlassCard>
            );
          })}
        </ol>
      </div>
    </section>
  );
}