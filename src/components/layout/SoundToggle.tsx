'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '@/lib/assets';

/**
 * Optional audio.
 *
 * Off by default and never autoplays: nothing loads until the visitor asks for
 * it. If the audio files are missing the toggle reports that rather than
 * failing silently.
 */
export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Availability is a pure function of the scanned asset, not state that needs
  // to be synchronised after mount.
  const lullaby = asset('audio/lullaby');
  const available = lullaby.exists;

  const toggle = useCallback(() => {
    if (!lullaby.exists) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(lullaby.src);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }

    const audio = audioRef.current;
    if (enabled) {
      audio.pause();
      setEnabled(false);
    } else {
      // Autoplay policies block this until a gesture; this runs inside a click.
      void audio.play().then(
        () => setEnabled(true),
        // Autoplay was refused, so there is nothing to toggle.
        () => undefined,
      );
    }
  }, [enabled, lullaby]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="grid size-11 place-items-center rounded-full border-2 border-white/10 text-paper transition-colors hover:bg-dusk/40"
      data-testid="sound-toggle"
    >
      <span className="sr-only">{enabled ? 'Turn sound off' : 'Turn sound on'}</span>
      <span aria-hidden="true" className="grid place-items-center">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {enabled ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : (
            <>
              <path d="m16 9 5 6" />
              <path d="m21 9-5 6" />
            </>
          )}
        </svg>
      </span>
    </button>
  );
}