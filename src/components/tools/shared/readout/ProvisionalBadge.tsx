/** Distinguishes tile preview candidates from Overpass/bundle-confirmed places. */
export function ProvisionalBadge() {
  return (
    <span className="ml-2 inline-flex rounded-sm bg-ink-faint/15 px-1.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide text-ink-dim">
      Preview
    </span>
  );
}
