/** Map-first placement and exit-held Ask are independent (not exclusive). */
export function resolveHidingZoneHudPresence(input: {
  mapFirstEligible: boolean;
  askExitMounted: boolean;
}): { showMapFirst: boolean; showAsk: boolean } {
  return {
    showMapFirst: input.mapFirstEligible,
    showAsk: input.askExitMounted,
  };
}
