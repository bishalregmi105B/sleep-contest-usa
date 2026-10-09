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
    const reserve = document.getElementById('reserve');
    if (!reserve) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );

    observer.observe(reserve);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/90 px-4 pt-3 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <ButtonLink href="#reserve" event={RESERVE_CLICK} className="w-full">
        {HERO.cta}
      </ButtonLink>
    </div>
  );
}