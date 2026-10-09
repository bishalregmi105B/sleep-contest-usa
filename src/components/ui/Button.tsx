'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The site's one button.
 *
 * Primary is a solid `signal` pill with a soft realistic shadow and a 1px inner
 * highlight, which is what makes a dark surface read as physical. The pressed
 * state drops the shadow and moves 1px, the way a real key does. Secondary is a
 * hairline outline.
 *
 * Deliberately absent: hard offset shadows, sticker borders and any tilt. Those
 * were the clearest "cartoon" signals on the old build.
 *
 * Exported twice rather than as one polymorphic component so the DOM element is
 * always explicit: an anchor that navigates must be an anchor, for keyboard and
 * middle-click to work.
 */
type Variant = 'primary' | 'secondary' | 'ghost';

type BaseProps = {
  readonly children: ReactNode;
  readonly variant?: Variant;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
};

type ButtonProps = BaseProps &
  Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'children'>;

type LinkProps = BaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'>;

const SIZES = {
  // 44px minimum on the row height, so every variant is a comfortable target.
  sm: 'min-h-11 px-5 py-2 text-sm',
  md: 'min-h-12 px-6 py-3 text-base',
  lg: 'min-h-14 px-8 py-4 text-lg',
} as const;

const VARIANTS = {
  primary:
    'bg-signal text-signal-ink shadow-[var(--shadow-signal)] active:translate-y-px active:shadow-[var(--shadow-signal-press)] hover:bg-[#f05389]',
  secondary:
    'border border-white/25 text-paper hover:border-white/45 hover:bg-white/5 active:translate-y-px',
  ghost: 'text-mist hover:text-paper hover:bg-white/5',
} as const;

function classes({
  variant = 'primary',
  size = 'md',
  className = '',
}: Pick<BaseProps, 'variant' | 'size' | 'className'>): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-pill font-display font-bold',
    'uppercase tracking-wide no-underline transition-[transform,box-shadow,background-color,color]',
    'duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] -webkit-tap-highlight-color:transparent',
    SIZES[size],
    VARIANTS[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps) {
  const { children, variant, size, className, ...rest } = props;
  return (
    // `rest` is spread first so the computed className always wins: spreading
    // the whole props object after it would let a caller's own className
    // replace the button's styling entirely.
    <button type={rest.type ?? 'button'} {...rest} className={classes({ variant, size, className })}>
      {children}
    </button>
  );
}

export function ButtonLink(props: LinkProps) {
  const { children, variant, size, className, ...rest } = props;
  return (
    <Link {...rest} className={classes({ variant, size, className })}>
      {children}
    </Link>
  );
}