'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FRIENDS } from '@/content/site';
import { StickerButton } from '@/components/ui/StickerButton';

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
    <div className="rounded-lg border-2 border-dusk bg-indigo/70 p-6">
      <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-mint">
        {FRIENDS.yourLink}
      </h2>

      <p className="mt-3 break-all rounded-md bg-midnight/70 px-4 py-3 font-mono text-sm text-cream">
        {link}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <StickerButton onClick={copy} data-testid="copy-link">
          {FRIENDS.copy}
        </StickerButton>
        <StickerButton variant="ghost" onClick={share}>
          Share
        </StickerButton>
      </div>

      <p role="status" aria-live="polite" className="mt-3 min-h-5 font-mono text-sm text-mint">
        {status}
      </p>
    </div>
  );
}