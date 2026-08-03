/**
 * Shared MapFocus apply/skip policy for Leaflet and MapLibre shells.
 * Does not advance recenter tokens — callers update refs only after framing succeeds.
 */
export function shouldApplyMapFocus(args: {
  fitBoundsMode: "once" | "always";
  hasFitted: boolean;
  recenterToken: number;
  lastRecenterToken: number;
}): boolean {
  const recenterRequested = args.recenterToken !== args.lastRecenterToken;
  if (
    args.fitBoundsMode === "once" &&
    args.hasFitted &&
    !recenterRequested
  ) {
    return false;
  }
  return true;
}

/**
 * True when an existing MapFocus animation should be cancelled because a new
 * apply is starting. Cleanup must call stopMapCameraEase only when willApply is
 * true for this effect run (or on unmount of an effect that previously applied).
 * If willApply is false, leave any in-flight camera alone.
 */
export function shouldStopMapFocusAnimation(args: {
  willApply: boolean;
}): boolean {
  return args.willApply;
}
