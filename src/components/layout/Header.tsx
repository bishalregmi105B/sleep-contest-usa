'use client';

import { useEffect, useRef, useState } from 'react';
import { NAV, SITE } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';
import { MobileMenu } from './MobileMenu';
import { SoundToggle } from './SoundToggle';

/**
 * Floating navigation.
 *
 * A translucent ink bar with a hairline, not a pill with a hard border. Hides
 * when scrolling down and returns when scrolling up, so the header never covers
 * the content the visitor is reading. With reduced motion it stays visible at
 * all times.
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
      if (y > 140 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="content-frame pt-4">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-4 rounded-pill border border-white/10 bg-ink/85 px-4 py-2 shadow-[var(--shadow-card)] backdrop-blur-md"
        >
          <a
            href="#hero"
            className="flex items-center gap-2.5 font-display text-sm font-bold uppercase tracking-wide text-paper"
          >
            <CrescentMark />
            <span className="hidden sm:inline">{SITE.name}</span>
            <span className="sm:hidden">Sleep Contest</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-pill px-4 text-sm font-medium text-mist transition-colors duration-200 hover:bg-white/5 hover:text-paper"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <SoundToggle />
            <ButtonLink
              href="#reserve"
              size="sm"
              className="hidden sm:inline-flex"
            >
              Reserve for $10
            </ButtonLink>
            <MobileMenu />
          </div>
        </nav>
      </div>
    </header>
  );
}

/**
 * A plain crescent. No face, no nightcap, no pompom: the old mark was a
 * character, and a character is what made this read as a toy.
 */
function CrescentMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-tungsten" aria-hidden="true">
      <path
        d="M15.6 2.6a9.6 9.6 0 1 0 5.8 13.8 7.9 7.9 0 0 1-5.8-13.8Z"
        fill="currentColor"
      />
    </svg>
  );
}