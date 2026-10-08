/**
 * Local scrim for sections whose content sits directly on the sky.
 *
 * The palette passes WCAG AA on midnight and indigo (18.7:1 and 15.7:1 for
 * cream) but only reaches 2.9:1 against the dusk pink the sky passes through at
 * dusk and dawn. Rather than darkening the palette and losing the idea, each
 * section gets a soft pool of midnight behind its own content: dark enough to
 * hold AA text, transparent at the edges so the sky still reads as the sky.
 */
export function SectionScrim({ strength = 'normal' }: { readonly strength?: 'normal' | 'strong' }) {
  const opacity = strength === 'strong' ? 0.92 : 0.82;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(58% 46% at 50% 50%, rgba(11,6,32,${opacity}) 0%, rgba(11,6,32,${
          opacity * 0.72
        }) 58%, rgba(11,6,32,0) 100%)`,
      }}
    />
  );
}