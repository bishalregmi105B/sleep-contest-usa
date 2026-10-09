/**
 * First thing in the tab order: jump straight to the contest.
 * Visually hidden until focused.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-pill focus:bg-tungsten focus:px-5 focus:py-3 focus:font-display focus:text-base focus:text-ink focus:shadow-[var(--shadow-raised)]"
    >
      Skip to the contest
    </a>
  );
}