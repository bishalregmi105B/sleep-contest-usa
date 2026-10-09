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
import { NOSCRIPT } from '@/content/site';
import { paidCount } from '@/lib/registrations';

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
  try {
    count = await paidCount();
  } catch (err) {
    // A database that is not yet migrated must not take the page down.
    console.error(
      '[home] failed to read registration count:',
      err instanceof Error ? err.message : 'unknown',
    );
  }

  return <Counter count={count} />;
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