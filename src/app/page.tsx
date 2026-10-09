import { Suspense } from 'react';
import { connection } from 'next/server';
import { Header } from '@/components/layout/Header';
import { Ticker } from '@/components/layout/Ticker';
import { Footer } from '@/components/layout/Footer';
import { MobileReserveBar } from '@/components/layout/MobileReserveBar';
import { Preloader } from '@/components/layout/Preloader';
import { CinematicStage } from '@/components/media/CinematicStage';
import { FilmLayers } from '@/components/media/FilmLayers';
import { SceneSlot } from '@/components/three/SceneSlot';
import { JsonLd } from '@/components/layout/JsonLd';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { ScrollBinder } from '@/components/motion/ScrollBinder';
import { Hero } from '@/components/sections/Hero';
import { Counter } from '@/components/sections/Counter';
import { CounterLive } from '@/components/sections/CounterLive';
import { FactsBar } from '@/components/sections/FactsBar';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Squad } from '@/components/sections/Squad';
import { Prizes } from '@/components/sections/Prizes';
import { Gallery } from '@/components/sections/Gallery';
import { Reserve } from '@/components/sections/Reserve';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { NOSCRIPT, SITE } from '@/content/site';
import { paidCount } from '@/lib/registrations';
import { getSettings, getPublicSettings } from '@/lib/settings';
import { WorldOfSleepContests } from '@/components/sections/WorldOfSleepContests';
import { GwrBadge } from '@/components/gwr/GwrBadge';

/**
 * Home page.
 *
 * The layer stack, back to front:
 *
 *   L0  CinematicStage   the dusk-to-dawn sky, drawn in CSS from scroll
 *   L1  SceneSlot       one persistent R3F canvas: stars, moon, dust, shafts
 *   L2  section scrims  each block sits on its own pool of ink (WCAG AA)
 *   L3  FilmLayers      film grain and vignette over the whole page
 *
 * Sections sit above all of it. None of them creates a WebGL context of its
 * own, and the whole page still renders with no JavaScript and no images.
 */
export default function HomePage() {
  return (
    <>
      <noscript>
        <div className="fixed inset-x-0 top-0 z-[80] bg-ink px-4 py-3 text-center">
          <p className="mx-auto max-w-2xl text-sm text-mist">{NOSCRIPT.message}</p>
        </div>
      </noscript>

      <Preloader />
      <CinematicStage />
      {/* One fixed canvas behind everything, loaded after first paint. */}
      <SceneSlot />
      <FilmLayers />
      <SmoothScroll />
      <ScrollBinder />

      <JsonLd />
      <Header />
      <Suspense fallback={null}>
        <GwrHeroBadge />
      </Suspense>
      {/* Reserves the floating header's height so the ticker and the first
          section's copy never slide underneath it. */}
      <div aria-hidden="true" className="h-[72px] shrink-0" />
      <Ticker />

      <main id="main" className="relative z-10">
        {/*
          The facts bar is sticky, and a sticky element sticks inside its
          containing block. Wrapping the hero, the counter and the bar gives it
          one that ends here, so the bar appears once the hero scrolls away and
          releases at the counter instead of following the visitor to the
          footer.
        */}
        <div className="relative">
          <Hero />
          {/* Streamed, so the page still builds before the database exists and
              the static shell carries the hero. */}
          <Suspense fallback={<SectionFallback id="counter" />}>
            <CounterSection />
          </Suspense>
          <CounterLive />
          <FactsBar />
        </div>
        <HowItWorks />
        <Suspense fallback={null}>
          <WorldSection />
        </Suspense>
        <Squad />
        <Prizes />
        <Gallery />

        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<SectionFallback id="reserve" />}>
          <Reserve />
        </Suspense>

        <Faq />
        <Suspense fallback={<SectionFallback id="cta" />}>
          <FinalCtaSection />
        </Suspense>
      </main>

      <Footer />
      <MobileReserveBar />
    </>
  );
}

/**
 * The live counter.
 *
 * Split out and streamed so the build never has to reach a database: the shell
 * prerenders, this section streams in at request time, and a site that has not
 * run `npm run db:push` yet still builds instead of failing.
 */
async function CounterSection() {
  await connection();

  let count = 0;
  let milestones: number[] = [SITE.goal];
  let goal: number = SITE.goal;
  let counterMinPublic = SITE.counterMinPublic;

  try {
    const settings = await getSettings();
    milestones = [...settings.milestones];
    goal = settings.goal;
    counterMinPublic = settings.counterMinPublic;
    // O(1): reads the denormalised counter row, not COUNT(*).
    count = await paidCount();
  } catch (err) {
    // A database that is not yet migrated must not take the page down.
    console.error(
      '[home] failed to read registration count:',
      err instanceof Error ? err.message : 'unknown',
    );
  }

  return (
    <Counter
      count={count}
      milestones={milestones}
      goal={goal}
      counterMinPublic={counterMinPublic}
    />
  );
}

/**
 * The "sleep contests around the world" section, behind `showWorldSection`.
 *
 * Reads the cached public settings rather than the full document, and renders
 * nothing at all when the flag is off.
 */
async function WorldSection() {
  await connection();

  // The try only wraps the data read. Constructing JSX inside a try/catch does
  // not catch render errors — React renders later — so it would imply a
  // guarantee it cannot make.
  let show = false;
  try {
    show = (await getPublicSettings()).showWorldSection;
  } catch {
    // Never let an optional section take the home page down.
    show = false;
  }

  if (!show) return null;
  return <WorldOfSleepContests />;
}

/**
 * The final CTA carries the same count, so the count line under the button is
 * never a different number from the counter.
 */
async function FinalCtaSection() {
  await connection();

  let count = 0;
  try {
    count = await paidCount();
  } catch {
    /* Same as above: fall back to the truthful "no sleepers yet" line. */
  }

  return <FinalCta count={count} />;
}

/** Matches a section's height so a streamed section does not shift layout. */
function SectionFallback({ id }: { readonly id: string }) {
  return (
    <section id={id} className="section-shell" aria-hidden="true">
      <div className="content-frame" />
    </section>
  );
}

/**
 * The licensed-attempt badge in the hero.
 *
 * Behind `gwrEnabled`, which stays off until the client supplies written
 * approval from the record body (see src/content/gwr.ts and
 * CLIENT_INPUTS_NEEDED.md). Renders null when the flag is off or the asset is
 * missing, in which case no brand wording appears anywhere on the page.
 */
async function GwrHeroBadge() {
  await connection();

  let enabled = false;
  try {
    enabled = (await getPublicSettings()).gwrEnabled;
  } catch {
    // Off if settings cannot be read. Failing closed is the only safe default
    // for a licensed mark.
    enabled = false;
  }

  if (!enabled) return null;
  return <GwrBadge enabled className="mt-6" />;
}
