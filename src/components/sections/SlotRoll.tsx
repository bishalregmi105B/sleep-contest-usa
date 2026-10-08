'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Slot-machine roll from 0 to the grand prize, once, when the section is 50%
 * in view (A9). Reduced motion shows the final value immediately.
 */
export function SlotRoll({
  amount,
  label,
}: {
  readonly amount: number;
  readonly label: string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const run = () => {
      if (played.current) return;
      played.current = true;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setValue(amount);
        return;
      }

      const duration = 1400;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Ease out so it races then settles, like a real reel.
        const eased = 1 - Math.pow(1 - t, 4);
        setValue(Math.round(eased * amount));
        if (t < 1) requestAnimationFrame(tick);
        else setValue(amount);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.5) run();
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [amount]);

  return (
    <span
      ref={ref}
      className="font-mono text-5xl font-bold text-zzz tabular-nums sm:text-6xl"
      aria-label={`${label}: $${amount.toLocaleString('en-US')}`}
      data-testid="grand-prize"
    >
      <span aria-hidden="true">${value.toLocaleString('en-US')}</span>
    </span>
  );
}