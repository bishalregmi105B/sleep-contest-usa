import type { ReactNode } from 'react';

type GlassCardProps = {
  readonly children: ReactNode;
  readonly className?: string;
  /** Sticker cards tilt; glass cards stay square to the page. */
  readonly tilt?: 'left' | 'right' | 'none';
  readonly as?: 'div' | 'li' | 'article';
};

/**
 * Translucent indigo panel with a dusk border. The blur is applied by the
 * caller on the high tier only, because backdrop-filter is expensive.
 */
export function GlassCard({
  children,
  className = '',
  tilt = 'none',
  as: Tag = 'div',
}: GlassCardProps) {
  const tiltClass =
    tilt === 'left' ? 'tilt-l' : tilt === 'right' ? 'tilt-r' : '';

  return (
    <Tag
      className={`glass [box-shadow:var(--shadow-card)] ${tiltClass} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}