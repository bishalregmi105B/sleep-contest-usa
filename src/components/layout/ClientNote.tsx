/**
 * A decision the client still owes.
 *
 * Several answers on the rules and privacy pages cannot be written honestly
 * without the client: the hearing-protection policy, how heart-rate data is
 * kept, who adjudicates a dispute. They are surfaced on the page rather than
 * quietly omitted, because a paid-entry contest that is silent about safety
 * questions is worse than one that says the answer is not settled yet.
 *
 * They are rendered as a labelled note rather than as bracketed prose, so a
 * visitor never sees a literal "[CLIENT: confirm...]" in the copy.
 */
export function ClientNote({ children }: { readonly children: React.ReactNode }) {
  return (
    <p
      data-client-input=""
      className="flex gap-3 rounded-[10px] border border-tungsten/30 bg-tungsten/[0.07] p-4 text-sm leading-relaxed text-mist"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-tungsten"
      >
        Decision needed
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}