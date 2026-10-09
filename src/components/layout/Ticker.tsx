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
      className="relative flex h-9 sm:h-10 items-center overflow-hidden border-y border-white/15 bg-ink/80 backdrop-blur-md"
    >
      <div className="ticker-track gap-8">
        {[0, 1].map((copy) => (
          <span
            key={copy}
            className="shrink-0 pr-8 font-mono text-xs sm:text-[13px] font-medium uppercase tracking-[0.16em] text-paper/95"
            {...(copy === 1 ? { 'aria-hidden': true } : {})}
          >
            {TICKER} <span className="mx-2 text-tungsten font-bold">/</span> {TICKER}
          </span>
        ))}
      </div>
    </div>
  );
}