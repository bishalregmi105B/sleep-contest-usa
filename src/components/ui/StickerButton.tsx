import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'pink' | 'yellow' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  pink: 'sticker-btn',
  yellow: 'sticker-btn sticker-btn-yellow',
  ghost: 'sticker-btn sticker-btn-secondary',
};

const SIZES = {
  md: 'text-base',
  lg: 'text-lg px-7 py-4',
} as const;

/** Props shared by both renderings. */
type BaseProps = {
  readonly children: ReactNode;
  readonly variant?: Variant;
  readonly size?: keyof typeof SIZES;
  readonly className?: string;
};

type LinkProps = BaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'>;

type ButtonProps = BaseProps &
  Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'children'>;

type StickerButtonProps = LinkProps | ButtonProps;

/**
 * The site's one button: a pill with a hard offset shadow that sinks when
 * pressed. Renders as a link when given `href`, otherwise as a button.
 */
export function StickerButton(props: StickerButtonProps) {
  const { children, variant = 'pink', size = 'md', className = '' } = props;
  const classes = `${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();

  if ('href' in props && props.href !== undefined) {
    const { href, children: _c, variant: _v, size: _s, className: _k, ...rest } = props;
    void _c;
    void _v;
    void _s;
    void _k;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { children: _c, variant: _v, size: _s, className: _k, ...rest } =
    props as ButtonProps;
  void _c;
  void _v;
  void _s;
  void _k;

  return (
    <button type={(props as ButtonProps).type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}