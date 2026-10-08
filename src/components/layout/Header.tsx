'use client';

import { useEffect, useRef, useState } from 'react';
import { NAV, SITE } from '@/content/site';
import { StickerButton } from '@/components/ui/StickerButton';
import { MobileMenu } from './MobileMenu';
import { SoundToggle } from './SoundToggle';

/**
 * Floating pill navigation.
 *
 * Hides when scrolling down and returns when scrolling up (A16), so the header
 * never covers the content the visitor is reading. With reduced motion it stays
 * visible at all times.
 */
export function Header() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onScroll = () => {
      if (reduced) return;
      const y = window.scrollY;
      // Only react past a small threshold, so small bounces do not flicker it.
      if (y > 120 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="content-frame pt-4">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-4 rounded-pill border-2 border-dusk bg-midnight/85 px-4 py-2 [box-shadow:0_10px_30px_-12px_rgb(11_6_32_/_0.9)] backdrop-blur-md"
        >
          <a
            href="#hero"
            className="flex items-center gap-2 font-display text-sm font-black uppercase text-cream"
          >
            <MoonMark />
            <span className="hidden sm:inline">{SITE.name}</span>
            <span className="sm:hidden">Sleep Contest</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-pill px-4 text-body-sm font-bold text-lavender transition-colors hover:bg-dusk/50 hover:text-cream"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <SoundToggle />
            <StickerButton href="#reserve" className="hidden !min-h-11 !px-5 !py-2 text-sm sm:inline-flex">
              Reserve for $10
            </StickerButton>
            <MobileMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}

/** Moon in a nightcap, built in code so no image is needed. */
function MoonMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 place-items-center rounded-full bg-zzz"
    >
      <svg viewBox="0 0 24 24" className="size-5 text-ink">
        <path
          d="M15.5 3a9 9 0 1 0 5.5 12.9A7.5 7.5 0 0 1 15.5 3Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}