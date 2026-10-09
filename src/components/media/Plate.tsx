import Image from 'next/image';
import { asset, type AssetKey } from '@/lib/assets';

/**
 * An image slot that is never a grey box.
 *
 * Renders the photograph when one exists and, when it does not, falls back to a
 * dark cinematic gradient built from the section's own sky phase, plus grain.
 * That fallback is why the site can look intentional with zero generated
 * assets: a missing image reads as an unlit corner of the night rather than as
 * a placeholder.
 *
 * The gradient is deliberately *not* uniform: it carries a warm low glow, the
 * way a real frame shot at night does, so an empty slot still has depth.
 */
export function Plate({
  assetKey,
  alt,
  className = '',
  sizes = '(min-width: 1024px) 33vw, 100vw',
  priority = false,
  /** Duotone overlay. Only meaningful over a real photograph. */
  duotone = false,
  caption,
  /**
   * Rendered instead of the fallback gradient when the file is missing. Used
   * where an empty 3:2 box would read as a broken card rather than as art
   * direction: three identical unlit rectangles stacked side by side is worse
   * than no image area at all.
   */
  missing = null,
}: {
  readonly assetKey: AssetKey;
  /** Empty string marks the image decorative; the fallback then hides itself. */
  readonly alt: string;
  readonly className?: string;
  readonly sizes?: string;
  readonly priority?: boolean;
  readonly duotone?: boolean;
  readonly caption?: string;
  readonly missing?: React.ReactNode;
}) {
  const found = asset(assetKey);

  // Nothing to show and nothing to fall back to: let the caller lay itself out.
  if (!found.exists && missing !== null && !caption) {
    return <>{missing}</>;
  }

  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      {found.exists ? (
        <Image
          src={found.src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          {/*
            The fallback is an unlit frame, not a placeholder box: a cool wash,
            a low warm practical light and a hint of grain. It is dark enough to
            read as a photograph the site has not shot yet, which is exactly
            what it is, rather than as a grey rectangle waiting to be filled.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: [
                'radial-gradient(80% 46% at 50% 104%, rgba(255,184,103,0.16) 0%, transparent 70%)',
                'radial-gradient(140% 100% at 26% 12%, rgba(59,44,120,0.55) 0%, transparent 62%)',
                'linear-gradient(to top, #0B0620 0%, #120C36 52%, #07060F 100%)',
              ].join(', '),
            }}
          />
          {/* Film grain, so the slot has texture rather than being a flat fill. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23g)'/%3E%3C/svg%3E\")",
            }}
          />
          {/* A faint horizon line, so the gradient reads as a place at night. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </>
      )}

      {duotone ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 mix-blend-color"
          style={{ background: 'linear-gradient(160deg, #1B1450 0%, #3A2C78 45%, #FFB867 160%)' }}
        />
      ) : null}

      {caption ? (
        <span className="absolute bottom-3 left-3 rounded-sm bg-ink/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mist/60 backdrop-blur-sm">
          {caption}
        </span>
      ) : null}
    </div>
  );
}