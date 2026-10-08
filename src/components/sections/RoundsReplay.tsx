'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SQUAD } from '@/content/site';
import { StickerButton } from '@/components/ui/StickerButton';

/**
 * Plays the squad rounds once when the section is 60% in view (A8), and again
 * on demand. Spikes each strip then settles it flat.
 *
 * With reduced motion the button still works but only flips the strips to their
 * settled state, so the idea is never lost.
 */
export function RoundsReplay() {
  const [running, setRunning] = useState(false);
  const [settled, setSettled] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const played = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const play = useCallback(() => {
    clearTimers();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRunning(false);
      setSettled(true);
      return;
    }

    const section = sectionRef.current;
    if (section) {
      section.classList.remove('[animation:squad-shake_300ms_ease-out]');
      // Force a reflow so re-adding the class restarts the animation.
      void section.offsetWidth;
      section.classList.add('[animation:squad-shake_300ms_ease-out]');
    }

    setSettled(false);
    setRunning(true);

    // Three rounds, 700ms apart, then the strips flatten.
    for (let i = 0; i < 3; i += 1) {
      timers.current.push(setTimeout(() => setSettled(false), i * 700));
    }
    timers.current.push(setTimeout(() => {
      setRunning(false);
      setSettled(true);
    }, 3 * 700 + 500));
  }, [clearTimers]);

  // Play once on entry, then never again automatically.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.6 && !played.current) {
          played.current = true;
          play();
        }
      },
      { threshold: [0, 0.6, 1] },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [play]);

  return (
    <div
      ref={sectionRef as React.RefObject<HTMLDivElement>}
      className="flex flex-col items-center gap-4"
    >
      <StickerButton
        variant="yellow"
        onClick={play}
        aria-disabled={running}
        data-testid="rounds-replay"
      >
        {running ? 'Rounds running…' : SQUAD.replay}
      </StickerButton>

      <p className="sr-only" role="status" aria-live="polite">
        {settled ? 'The sleeper is still asleep. Heart rate flat.' : ''}
      </p>

      <div
        aria-hidden="true"
        className={`flex gap-3 ${settled ? '' : 'opacity-100'}`}
      >
        <span
          className={`h-1 w-16 rounded-full bg-pillow transition-transform ${settled ? 'scale-x-50' : 'scale-x-100'}`}
          style={{ transitionDuration: '600ms' }}
        />
        <span
          className={`h-1 w-16 rounded-full bg-pillow transition-transform ${settled ? 'scale-x-50' : 'scale-x-100'}`}
          style={{ transitionDuration: '600ms', transitionDelay: '80ms' }}
        />
        <span
          className={`h-1 w-16 rounded-full bg-pillow transition-transform ${settled ? 'scale-x-50' : 'scale-x-100'}`}
          style={{ transitionDuration: '600ms', transitionDelay: '160ms' }}
        />
      </div>
    </div>
  );
}