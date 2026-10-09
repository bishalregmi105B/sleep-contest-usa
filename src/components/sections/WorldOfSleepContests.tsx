import { WORLD_CONTESTS, WORLD_SECTION } from '@/content/world-context';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';

/**
 * "Sleep contests around the world".
 *
 * ## Text and links, deliberately
 *
 * The client asked for other countries' sleep-contest logos and photos. This
 * section does not have them, and the reason is worth stating in the code:
 *
 *  - Images pulled from a search engine and published on a commercial page that
 *    takes money are an infringement of somebody's copyright.
 *  - Another organiser's logo on this page reads as a partnership they never
 *    agreed to.
 *
 * So each entry is a year, a place, a few facts and a named source. That is also
 * the more credible version: the reader can check it.
 *
 * No photography, no animation, no new design language — the section reuses the
 * existing panel, hairline and type styles so it reads as part of the same page.
 */
export function WorldOfSleepContests() {
  return (
    <section id="world" aria-labelledby="world-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading title={WORLD_SECTION.heading} sub={WORLD_SECTION.intro} as="h2" />

        <ul className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3" data-testid="world-contests">
          {WORLD_CONTESTS.map((contest) => (
            <Card as="li" key={`${contest.year}-${contest.place}`} className="flex flex-col gap-4 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-mist font-semibold">
                {contest.year} · {contest.place}
              </p>

              <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-wide text-paper">
                {contest.headline}
              </h3>

              <ul className="flex flex-col gap-2">
                {contest.facts.map((fact) => (
                  <li key={fact} className="text-sm leading-relaxed text-mist">
                    {fact}
                  </li>
                ))}
              </ul>

              <p className="mt-auto pt-2 text-xs text-mist/80">
                <a
                  href={contest.source.url}
                  target="_blank"
                  // noopener/noreferrer: the links leave the site, and
                  // `noreferrer` stops the referrer leaking a visitor's
                  // ticket-bearing URL to the publisher.
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
                >
                  Source: {contest.source.publisher}
                </a>
                {contest.outcomeUnverified ? (
                  <span className="block pt-1">Outcome not confirmed at the time of writing.</span>
                ) : null}
              </p>
            </Card>
          ))}
        </ul>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-mist">{WORLD_SECTION.disclaimer}</p>
      </div>
    </section>
  );
}
