export type SpectatorLayerConfig = {
  showSeekerLocations: boolean;
  showHiderLocations: boolean;
  showHidingZones: boolean;
  chatDisplayRole: "observer";
};

/** Admin + observer maps always show both seeker and hider layers. */
export function resolveSpectatorLayers(): SpectatorLayerConfig {
  return {
    showSeekerLocations: true,
    showHiderLocations: true,
    showHidingZones: true,
    chatDisplayRole: "observer",
  };
}
