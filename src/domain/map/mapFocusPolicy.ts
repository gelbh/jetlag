/**
 * Shared MapFocus apply/skip policy for Leaflet and MapLibre shells.
 * Does not advance recenter tokens — callers update refs only after framing succeeds.
 */
export function shouldApplyMapFocus(args: {
  fitBoundsMode: "once" | "always";
  hasFitted: boolean;
  recenterToken: number;
  lastRecenterToken: number;
}): { apply: boolean; recenterRequested: boolean } {
  const recenterRequested = args.recenterToken !== args.lastRecenterToken;
  if (
    args.fitBoundsMode === "once" &&
    args.hasFitted &&
    !recenterRequested
  ) {
    return { apply: false, recenterRequested };
  }
  return { apply: true, recenterRequested };
}
