import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Ticker } from '@/components/layout/Ticker';
import { Footer } from '@/components/layout/Footer';
import { MobileReserveBar } from '@/components/layout/MobileReserveBar';
import { SceneSlot } from '@/components/three/SceneSlot';
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
export default async function HomePage() {
  // A database that is not yet migrated should not take the page down.
  let count = 0;
  try {
    count = await paidCount();
  } catch (err) {
    console.error(
      '[home] failed to read registration count:',
      err instanceof Error ? err.message : 'unknown',
    );
  }

  return (
    <>
      {/* One fixed canvas behind everything, loaded after first paint. */}
      <SceneSlot />
      <SmoothScroll />
      <ScrollBinder />

      <Header />
      <Ticker />

      <main id="main" className="relative z-10">
        <Hero />
        <Counter count={count} />
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

/** Matches the Reserve section's height so the fallback does not shift layout. */
function ReserveFallback() {
  return (
    <section id="reserve" className="section-shell">
      <div className="content-frame" />
    </section>
  );
}