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
        <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-tungsten/80">
          {eyebrow}
        </p>
      ) : null}
      <Tag
        className={`font-display font-extrabold uppercase tracking-[-0.01em] text-paper ${
          centered ? 'text-[clamp(2rem,5vw,3.25rem)]' : 'text-[clamp(1.75rem,4vw,2.5rem)]'
        }`}
      >
        {title}
      </Tag>
      {sub ? (
        <p className={`mt-5 text-lg leading-relaxed text-mist ${centered ? 'mx-auto' : ''}`}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}