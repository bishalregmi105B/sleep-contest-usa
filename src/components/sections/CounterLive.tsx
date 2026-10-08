'use client';

import { useEffect } from 'react';

/**
 * Keeps the counter fresh after hydration.
 *
 * Mounts nothing of its own: it finds the server-rendered value by its test id
 * and writes the refreshed number into that same node, so the visible number
 * updates without remounting the section or re-running its entrance animation.
 * The heartbeat line is left at the server value until the page reloads, which
 * keeps the visual and the accessible value consistent.
 */
export function CounterLive() {
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (cancelled || typeof data.count !== 'number') return;

        const node = document.querySelector('[data-testid="counter-value"]');
        if (node) {
          node.textContent = data.count.toLocaleString('en-US');
          // The heartbeat's accessible value should match what is shown.
          const bar = document.querySelector<HTMLElement>('[role="progressbar"]');
          bar?.setAttribute('aria-valuenow', String(data.count));
        }
      } catch {
        // Offline: keep the server-rendered number.
      }
    };

    const id = setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}