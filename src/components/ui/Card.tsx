import type { ReactNode } from 'react';

/**
 * Hairline surface: 4% white fill, 1px white border, layered soft shadow.
 *
 * The inset 1px highlight at the top is what stops a dark card reading as a
 * flat rectangle, so it lives in the shared shadow rather than in every call
 * site. Never tilts; the previous version had a `tilt` prop that nothing should
 * reach for again.
 */
export function Card({
  children,
  className = '',
  as: Tag = 'div',
  interactive = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'li' | 'article' | 'aside' | 'section';
  /** Adds the slow 1.03 zoom and lift used by the gallery tiles. */
  readonly interactive?: boolean;
}) {
  return (
    <Tag
      className={[
        'panel',
        interactive
          ? 'transition-[transform,box-shadow,border-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none hover:-translate-y-0.5 hover:border-white/20'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}