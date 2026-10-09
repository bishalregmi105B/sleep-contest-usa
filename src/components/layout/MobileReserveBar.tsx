'use client';

import { useEffect, useState } from 'react';
import { HERO } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';
import { RESERVE_CLICK } from '@/lib/analytics';

/**
 * Sticky bottom bar carrying the primary CTA on small screens.
 *
 * Hides while the Reserve section is in view so it never covers the form, and
 * respects the home indicator via a safe-area inset.
 */
export function MobileReserveBar() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const reserve = document.getElementById('reserve');

    let heroVisible = true;
    let reserveVisible = false;

    const update = () => {
      setHidden(heroVisible || reserveVisible);
    };

    const heroObserver = hero
      ? new IntersectionObserver(
          ([entry]) => {
            heroVisible = entry?.isIntersecting ?? false;
            update();
          },
          { threshold: 0.25 },
        )
      : null;

    const reserveObserver = reserve
      ? new IntersectionObserver(
          ([entry]) => {
            reserveVisible = entry?.isIntersecting ?? false;
            update();
          },
          { threshold: 0.15 },
        )
      : null;

    if (hero && heroObserver) heroObserver.observe(hero);
    if (reserve && reserveObserver) reserveObserver.observe(reserve);

    return () => {
      heroObserver?.disconnect();
      reserveObserver?.disconnect();
    };
  }, []);

  return (
    <div
      className={`no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-ink/95 px-4 pt-2.5 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <ButtonLink href="#reserve" event={RESERVE_CLICK} className="w-full">
          {HERO.cta}
        </ButtonLink>
        <p className="font-mono text-[11px] text-paper/90 font-medium text-center">
          $10 to hold spot · 100% money-back guarantee
        </p>
      </div>
    </div>
  );
}