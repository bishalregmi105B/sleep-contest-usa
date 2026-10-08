import type { ReactNode } from 'react';

/**
 * Shared section heading.
 *
 * Deliberately not a tracked-out uppercase eyebrow above every heading — that
 * is a template tell. The eyebrow is optional and only used where the label
 * carries real meaning.
 */
export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'center',
  as: Tag = 'h2',
}: {
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly sub?: ReactNode;
  readonly align?: 'center' | 'left';
  readonly as?: 'h2' | 'h3';
}) {
  const centered = align === 'center';

  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-mint">
          {eyebrow}
        </p>
      ) : null}
      <Tag
        className="text-headline-lg-mobile md:text-headline-lg font-display font-extrabold text-cream sm:text-4xl"
      >
        {title}
      </Tag>
      {sub ? (
        <p
          className={`mt-4 text-body-lg text-lavender ${centered ? 'mx-auto' : ''}`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}