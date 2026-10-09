import { getPublicSettings } from '@/lib/settings';
import { GwrBadge } from './GwrBadge';

/**
 * The badge, placed where the brief asked for it.
 *
 * Every placement goes through this one server component so the gate is
 * applied in exactly one place. Four call sites that each checked the flag
 * separately is four places for the next person to forget one.
 *
 * Renders null when disabled, and the badge itself renders null when the asset
 * file is absent — so a deployment without the logo shows nothing rather than a
 * broken image.
 */
export async function GwrSlot({
  className = '',
  variant = 'card',
}: {
  readonly className?: string;
  readonly variant?: 'card' | 'inline';
}) {
  let enabled = false;
  try {
    enabled = (await getPublicSettings()).gwrEnabled;
  } catch {
    // Fail closed. A licensed mark should never appear because a settings read
    // happened to fail.
    enabled = false;
  }

  if (!enabled) return null;
  return <GwrBadge enabled variant={variant} className={className} />;
}
