import { Suspense } from 'react';
import { connection } from 'next/server';
import { Header } from '@/components/layout/Header';
import { Ticker } from '@/components/layout/Ticker';
import { Footer } from '@/components/layout/Footer';
import { MobileReserveBar } from '@/components/layout/MobileReserveBar';
import { SceneSlot } from '@/components/three/SceneSlot';
import { JsonLd } from '@/components/layout/JsonLd';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { ScrollBinder } from '@/components/motion/ScrollBinder';
import { Hero } from '@/components/sections/Hero';
import { Counter } from '@/components/sections/Counter';
import { CounterLive } from '@/components/sections/CounterLive';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Squad } from '@/components/sections/Squad';
import { Prizes } from '@/components/sections/Prizes';
import { Gallery } from '@/components/sections/Gallery';
import { Reserve } from '@/components/sections/Reserve';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { paidCount } from '@/lib/registrations';

/**
 * Home page.
 *
 * Server-rendered except for the interactive islands (the 3D scene, the counter
 * refresh, the menu and the form). Sections sit above a single fixed canvas;
 * none of them creates a WebGL context of its own.
 */
export default function HomePage() {
  return (
    <>
      {/* One fixed canvas behind everything, loaded after first paint. */}
      <SceneSlot />
      <SmoothScroll />
      <ScrollBinder />

      <JsonLd />
      <Header />
      {/* Reserves the floating header's height so the ticker and the first
          section's copy never slide underneath it. */}
      <div aria-hidden="true" className="h-20 shrink-0" />
      <Ticker />

      <main id="main" className="relative z-10">
        <Hero />
        {/* Streamed, so the page still builds before the database exists and
            the static shell carries the hero. */}
        <Suspense fallback={<CounterFallback />}>
          <CounterSection />
        </Suspense>
        <CounterLive />
        <HowItWorks />
        <Squad />
        <Prizes />
        <Gallery />

        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<ReserveFallback />}>
          <Reserve />
        </Suspense>

        <Faq />
        <FinalCta />
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

/** Matches the counter's height so the streamed section does not shift layout. */
function CounterFallback() {
  return (
    <section id="counter" className="section-shell">
      <div className="content-frame" />
    </section>
  );
}

/** Matches the Reserve section's height so the fallback does not shift layout. */
function ReserveFallback() {
  return (
    <section id="reserve" className="section-shell">
      <div className="content-frame" />
    </section>
  );
}