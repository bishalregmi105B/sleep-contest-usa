/**
 * "Sleep contests around the world".
 *
 * ## Why this file is text and links, and not photos and logos
 *
 * The client asked for logos and photos from other countries' sleep contests.
 * Two things stop that being the obvious implementation:
 *
 *  1. **Copyright and trademark.** Scraping images from a search engine and
 *     putting them on a commercial page is infringement, and it is how sites
 *     end up with takedown notices.
 *  2. **Implied affiliation.** Showing another organiser's logo on a page that
 *     takes money reads as a partnership, which none of these organisers agreed
 *     to.
 *
 * So the section is text and outbound links, and every entry names its source.
 * If an image is ever wanted, it has to come through the licensed-media gate in
 * `licensed-media.ts`, which `scripts/check-media.mjs` enforces at build time.
 *
 * ## How these entries were verified
 *
 * Every fact below was checked against a source that was actually fetched, not
 * against a search snippet. Entries whose facts could not be confirmed were
 * dropped rather than softened. Where sources contradicted the brief, the
 * sources won and the correction is recorded here:
 *
 *  - The organiser of the 2010 Spanish championship is the **Asociación
 *    Nacional de Amigos de la Siesta (ANAS)**. The client brief said "AEV"; no
 *    source supports that abbreviation, so it is not used.
 *  - The Spanish event was **2010**. Reporting of a 2011 edition appears to
 *    conflate it with an unrelated event, so 2010 is stated and nothing is
 *    claimed for 2011.
 *  - **businessinsider.in no longer resolves.** The domain is decommissioned, so
 *    the citation points at a Wayback snapshot of the archived article. Linking
 *    a dead domain is worse than linking an archive.
 *  - The Japanese event's **outcome is unverified**. It is presented as an
 *    announced competition, never as a concluded one.
 *
 * The phrase "world's first" is deliberately absent throughout.
 */

export type WorldContest = {
  readonly year: number;
  readonly place: string;
  readonly headline: string;
  readonly facts: readonly string[];
  readonly source: {
    readonly publisher: string;
    readonly title: string;
    readonly url: string;
    /** ISO date the source was fetched. */
    readonly retrievedAt: string;
  };
  /**
   * True when the event was announced but its result could not be confirmed.
   * The copy is written so it makes no claim about the outcome.
   */
  readonly outcomeUnverified?: boolean;
};

export const WORLD_SECTION = {
  heading: 'Sleep contests are a real thing.',
  intro: 'People have been competing at sleep for years. Here is what has been done before.',
  disclaimer:
    'We are not affiliated with the events above, and we have not used their logos or photographs.',
  cta: 'Your turn',
} as const;

export const WORLD_CONTESTS: readonly WorldContest[] = [
  {
    year: 2010,
    place: 'Madrid, Spain',
    headline: 'The first national siesta championship',
    facts: [
      'Held over nine days in October 2010 at the Islazul shopping centre in Carabanchel, Madrid.',
      'Around 360 contestants slept for roughly twenty minutes each, in rounds of five.',
      'A doctor attached a pulse meter to each contestant so a judge could tell whether they were genuinely asleep.',
      'Points were awarded for snoring, for unusual sleeping positions and for striking pyjamas.',
      'The top prize was 1,000 euros, with 500 and 250 euros for second and third place.',
      'Under a third of the entrants fell asleep at all.',
    ],
    source: {
      publisher: 'NBC News',
      title: "Spain's first siesta competition",
      url: 'https://www.nbcnews.com/id/wbna39816469',
      retrievedAt: '2026-10-09',
    },
  },
  {
    year: 2020,
    place: 'India',
    headline: 'Being paid to sleep, and a national sleep championship',
    facts: [
      'Wakefit, a mattress company, ran a "Sleep Internship" that paid people to sleep nine uninterrupted hours a night for a hundred consecutive nights.',
      'Each intern was paid 1 lakh rupees, with a 10 lakh rupee prize for the overall winner, titled India’s Sleep Champion.',
      'The first season selected 23 interns from about 170,000 applications across roughly 30 countries.',
      'The company also ran a separate National Sleep Championship, again with a 10 lakh rupee top prize, decided from sleep-tracker data.',
    ],
    source: {
      publisher: 'afaqs',
      title: "Wakefit's new campaign aims to breed sleepy millionaires",
      url: 'https://www.afaqs.com/news/mktg/wakefits-new-campaign-aims-to-breed-sleepy-millionaires',
      retrievedAt: '2026-10-09',
    },
  },
  {
    year: 2026,
    place: 'Tokyo, Japan',
    headline: 'A long-sleep race judged on sleep-monitoring data',
    facts: [
      'Mattrace by Koala, run by the mattress brand Koala Japan, was held in Minato, Tokyo.',
      'Competitors took part in three races of ninety minutes each, lying on Koala mattresses.',
      'Scoring used a worn sleep-monitoring device, judging sleep depth, quality, time taken to fall asleep and stability — with the organisers deliberately introducing disturbances to test that last one.',
      'Sleeping pills and deliberate sleep deprivation were both prohibited by the rules.',
      'The advertised top prize was 2,220,000 yen.',
    ],
    source: {
      publisher: 'The Economic Times',
      title: "Japan's sleep contest offers a 2.2 million yen prize",
      url: 'https://economictimes.indiatimes.com/news/international/global-trends/japans-sleep-contest-offers-13-lakh-prize/134288368.cms',
      retrievedAt: '2026-10-09',
    },
    // The event date has passed and no published result could be confirmed, so
    // the copy states what was announced and stops there.
    outcomeUnverified: true,
  },
];

/**
 * Drop-in line for the footer and for anyone asking about these events.
 *
 * The client may still want photography here. It needs written permission or a
 * purchased licence for each image; see CLIENT_INPUTS_NEEDED.md.
 */
export const MEDIA_PERMISSION_NOTE =
  'Any photo or logo of another event needs written permission or a licence from that organiser. Until then we use text and links.';