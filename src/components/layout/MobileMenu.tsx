'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV } from '@/content/site';
import { ButtonLink } from '@/components/ui/Button';

/**
 * Full-screen mobile menu.
 *
 * Traps focus while open, closes on Escape, marks the rest of the page
 * `inert` so neither pointer nor keyboard can reach it, and restores focus to
 * the trigger on close.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Captured now, because by cleanup time the ref will have moved on.
    const trigger = triggerRef.current;

    // Move focus into the panel.
    const first = panel.querySelector<HTMLElement>('a, button');
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;

      // Focus trap: cycle within the panel.
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Lock the page behind the menu.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="grid size-11 place-items-center rounded-full border border-white/15 text-paper transition-colors duration-200 hover:bg-white/5 lg:hidden"
      >
        <span className="sr-only">Open menu</span>
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col bg-ink/98 px-6 py-6 backdrop-blur-lg lg:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-paper">Menu</span>
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-full border border-white/15 text-2xl font-light text-paper"
            >
              <span className="sr-only">Close menu</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex min-h-14 items-center border-b border-white/10 font-display text-2xl font-bold uppercase tracking-wide text-paper"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto">
            <ButtonLink href="#reserve" size="lg" className="w-full" onClick={close}>
              Reserve for $10
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </>
  );
}