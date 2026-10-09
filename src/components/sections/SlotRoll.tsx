'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The grand prize numeral.
 *
 * Rolls once from zero when the section is half in view, then sits still. The
 * easing is a quartic ease-out over 1.4s: it decelerates like a physical reel
 * rather than bouncing or overshooting, which is what the old slot animation
 * did.
 *
 * The foil gradient is applied to the text, so the value stays selectable and
 * readable by a screen reader rather than being baked into an image.
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
      className="text-foil block font-display text-[clamp(3.5rem,13vw,11rem)] font-extrabold leading-[0.85] tracking-[-0.02em]"
      aria-label={`${label}: $${amount.toLocaleString('en-US')}`}
      data-testid="grand-prize"
      data-numeric
    >
      <span aria-hidden="true">${value.toLocaleString('en-US')}</span>
    </span>
  );
}