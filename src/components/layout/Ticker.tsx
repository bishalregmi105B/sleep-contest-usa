import { TICKER } from '@/content/site';

/**
 * Marquee ticker.
 *
 * A thin 28px strip in mono, separated by slashes. The previous version used a
 * star glyph between each item and a fat yellow bar; both were template tells.
 *
 * The track is duplicated for a seamless loop; the duplicate is hidden from
 * assistive tech so the message is not announced twice. Pure CSS, no JS.
 */
export function Ticker() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-7 items-center overflow-hidden border-y border-white/10 bg-ink/60 backdrop-blur-sm"
    >
      <div className="ticker-track gap-8">
        {[0, 1].map((copy) => (
          <span
            key={copy}
            className="shrink-0 pr-8 font-mono text-[11px] uppercase tracking-[0.18em] text-mist/70"
            {...(copy === 1 ? { 'aria-hidden': true } : {})}
          >
            {TICKER} <span className="text-tungsten/60">/</span> {TICKER}
          </span>
        ))}
      </div>
    </div>
  );
}