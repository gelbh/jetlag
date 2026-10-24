export function resolveHidingZoneHudPresence(input: {
  mapFirstEligible: boolean;
  askExitMounted: boolean;
}): { showMapFirst: boolean; showAsk: boolean } {
  return {
    showMapFirst: input.mapFirstEligible,
    showAsk: input.askExitMounted,
  };
}
