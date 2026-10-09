/**
 * Local scrim for sections whose content sits over the cinematic stage.
 *
 * The sky runs from burnt amber at dusk to warm sunrise, and `paper` text only
 * reaches AA against the darkest stops. Rather than darkening the palette and
 * losing the idea, each section gets its own pool of ink behind its content:
 * dark enough to hold AA text, transparent at the edges so the sky still reads
 * as the sky.
 */
export function SectionScrim({ strength = 'normal' }: { readonly strength?: 'normal' | 'strong' }) {
  const opacity = strength === 'strong' ? 0.92 : 0.78;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(62% 52% at 50% 50%, rgba(7,6,15,${opacity}) 0%, rgba(7,6,15,${
          opacity * 0.7
        }) 58%, rgba(7,6,15,0) 100%)`,
      }}
    />
  );
}