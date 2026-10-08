'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTER } from '@/content/site';
import { StickerButton } from '@/components/ui/StickerButton';

/**
 * "Bring a friend" share control.
 *
 * Uses the Web Share API where it exists, and falls back to copying the link
 * with a polite toast. The status message is announced through a live region
 * so screen reader users hear the result of the copy.
 */
export function ShareButton() {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const announce = useCallback((message: string) => {
    setStatus(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 4000);
  }, []);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/friends`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Great America’s Sleep Contest',
          text: '200,000 Americans are trying to sleep through a wake-up squad. Win $100,000.',
          url,
        });
        return;
      } catch (err) {
        // AbortError means the visitor closed the sheet, which is not an error
        // worth reporting.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      announce('Link copied. Send it to a friend.');
    } catch {
      announce('Copy failed. Copy the link from your address bar.');
    }
  }, [announce]);

  return (
    <>
      <StickerButton variant="ghost" onClick={share} data-testid="share-button">
        {COUNTER.bringFriend}
      </StickerButton>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {status ? (
        <p className="w-full text-center font-mono text-sm text-mint" aria-hidden="true">
          {status}
        </p>
      ) : null}
    </>
  );
}