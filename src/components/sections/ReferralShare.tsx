'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FRIENDS } from '@/content/site';
import { Button } from '@/components/ui/Button';

/**
 * Referral link with copy and share controls.
 *
 * Web Share API where available, clipboard otherwise. The result is announced
 * through a live region so it is not a purely visual confirmation.
 */
export function ReferralShare({ link }: { readonly link: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const announce = useCallback((message: string) => {
    setStatus(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 4000);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      announce('Link copied to your clipboard.');
    } catch {
      announce('Copy failed. Select the link and copy it manually.');
    }
  }, [link, announce]);

  const share = useCallback(async () => {
    if (!navigator.share) {
      await copy();
      return;
    }

    try {
      await navigator.share({
        title: "The Great America's Sleep Contest",
        text: '200,000 Americans are trying to sleep through a wake-up squad. Win $100,000.',
        url: link,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      await copy();
    }
  }, [link, copy]);

  return (
    <div className="panel p-6">
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-mist/60">
        {FRIENDS.yourLink}
      </h2>

      <p className="mt-3 break-all rounded-[10px] border border-white/10 bg-ink/50 px-4 py-3 font-mono text-sm text-paper">
        {link}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={copy} data-testid="copy-link">
          {FRIENDS.copy}
        </Button>
        <Button variant="secondary" onClick={share}>
          Share
        </Button>
      </div>

      <p role="status" aria-live="polite" className="mt-3 min-h-5 font-mono text-sm text-mint/80">
        {status}
      </p>
    </div>
  );
}