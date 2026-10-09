'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SQUAD } from '@/content/site';
import { Button } from '@/components/ui/Button';

/**
 * Plays the squad rounds once when the section is 60% in view, and again on
 * demand. Each round flashes a short tungsten pulse and shakes the wrapper by
 * 2px for 200ms, then the strips settle flat.
 *
 * The old version used a 3px black-bordered offset animation and a yellow
 * sticker button; the shake is now a brief, small physical nudge and the button
 * is the site's normal one.
 *
 * With reduced motion the button still works but only flips the strips to their
 * settled state, so the idea is never lost.
 */
export function RoundsReplay() {
  const [running, setRunning] = useState(false);
  const [settled, setSettled] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
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
      section.classList.remove('is-rounds-flash');
      // Force a reflow so re-adding the class restarts the animation.
      void section.offsetWidth;
      section.classList.add('is-rounds-flash');
    }

    setSettled(false);
    setRunning(true);

    // Three rounds, 700ms apart, then the strips flatten.
    for (let i = 0; i < 3; i += 1) {
      timers.current.push(setTimeout(() => setSettled(false), i * 700));
    }
    timers.current.push(
      setTimeout(() => {
        setRunning(false);
        setSettled(true);
      }, 3 * 700 + 500),
    );
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
    <div ref={sectionRef} className="flex flex-col items-center gap-4">
      <Button
        variant="secondary"
        onClick={play}
        aria-disabled={running}
        data-testid="rounds-replay"
      >
        {running ? 'Rounds running…' : SQUAD.replay}
      </Button>

      <p className="sr-only" role="status" aria-live="polite">
        {settled ? 'The sleeper is still asleep. Heart rate flat.' : ''}
      </p>

      <div aria-hidden="true" className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 w-16 rounded-full bg-signal transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              settled ? 'scale-x-50 opacity-40' : 'scale-x-100 opacity-100'
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}