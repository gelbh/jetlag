import type { PlayerRole } from "./playerRole";

export type ObserverPerspective = "both" | "seeker" | "hider";

export type SpectatorLayerConfig = {
  showSeekerLocations: boolean;
  showHiderLocations: boolean;
  showHidingZones: boolean;
  chatDisplayRole: "seeker" | "hider" | "observer";
};

export const OBSERVER_PERSPECTIVE_OPTIONS: ReadonlyArray<{
  value: ObserverPerspective;
  label: string;
}> = [
  { value: "both", label: "Both" },
  { value: "seeker", label: "Seeker" },
  { value: "hider", label: "Hider" },
];

export function resolveSpectatorLayers(
  perspective: ObserverPerspective,
  myRole: PlayerRole,
): SpectatorLayerConfig {
  void myRole;
  switch (perspective) {
    case "both":
      return {
        showSeekerLocations: true,
        showHiderLocations: true,
        showHidingZones: true,
        chatDisplayRole: "observer",
      };
    case "seeker":
      return {
        showSeekerLocations: true,
        showHiderLocations: false,
        showHidingZones: false,
        chatDisplayRole: "seeker",
      };
    case "hider":
      return {
        showSeekerLocations: true,
        showHiderLocations: true,
        showHidingZones: true,
        chatDisplayRole: "hider",
      };
    default: {
      const _exhaustive: never = perspective;
      return _exhaustive;
    }
  }
}
