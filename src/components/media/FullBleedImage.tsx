import Image from 'next/image';
import { asset } from '@/lib/assets';
import { PLACEHOLDER } from './placeholder';

/**
 * Full-bleed section image with a scrim for text contrast.
 *
 * Renders the asset when it exists and a CSS gradient placeholder when it does
 * not, so a missing file is never a 404 or a blank box.
 */
export function FullBleedImage({
  assetKey,
  alt,
  priority = false,
  className = '',
  overlay = 'bottom',
}: {
  readonly assetKey: string;
  readonly alt: string;
  readonly priority?: boolean;
  readonly className?: string;
  readonly overlay?: 'bottom' | 'center' | 'none';
}) {
  const found = asset(assetKey);

  const scrim = {
    bottom:
      'bg-gradient-to-t from-midnight via-midnight/70 to-midnight/10',
    center: 'bg-ink/55',
    none: '',
  }[overlay];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden={alt ? undefined : true}>
      {found.exists ? (
        <Image
          src={found.src}
          alt={alt}
          fill
          priority={priority}
          // The hero poster is the LCP element; it must not be lazy.
          loading={priority ? undefined : 'lazy'}
          sizes="100vw"
          placeholder="blur"
          blurDataURL={PLACEHOLDER}
          className="object-cover"
        />
      ) : (
        <div
          className="size-full"
          style={{
            background:
              'radial-gradient(120% 90% at 70% 30%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
          }}
        />
      )}
      {scrim ? <div className={`absolute inset-0 ${scrim}`} /> : null}
    </div>
  );
}