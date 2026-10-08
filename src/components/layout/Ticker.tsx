import { TICKER } from '@/content/site';

/**
 * Marquee ticker.
 *
 * The track is duplicated for a seamless loop; the duplicate is hidden from
 * assistive tech so the message is not announced twice. Pure CSS, no JS.
 *
 * Sits directly below the fixed header, so it carries the header's height and
 * the page reserves that space: without it the first section's copy slides
 * under the floating nav.
 */
export function Ticker() {
  return (
    <div className="relative overflow-hidden border-y-2 border-dusk bg-indigo/90 py-2">
      <div className="ticker-track gap-8">
        {[0, 1].map((copy) => (
          <span
            key={copy}
            className="shrink-0 pr-8 font-mono text-sm font-bold tracking-wide text-zzz"
            // Only the first copy is announced.
            {...(copy === 1 ? { 'aria-hidden': true } : {})}
          >
            {TICKER} ★ {TICKER} ★
          </span>
        ))}
      </div>
    </div>
  );
}