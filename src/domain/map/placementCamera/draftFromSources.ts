import type { MapDraftOverlaySources } from "../../../hooks/map-screen/useMapDraftOverlays";
import type { PlacementCameraDraftState } from "./types";

export function placementCameraDraftFromOverlaySources(
  sources: MapDraftOverlaySources,
): PlacementCameraDraftState {
  return {
    radar: {
      center: sources.radar.center,
      radiusMeters: sources.radar.radiusMeters,
      answer: sources.radar.answer,
    },
    pin: { point: sources.pin.point },
    tentacle: {
      center: sources.tentacle.center,
      searchRadiusMeters: sources.tentacle.searchRadiusMeters,
      answerRadiusMeters: sources.tentacle.answerRadiusMeters,
      selectedPoiId: sources.tentacle.selectedPoiId,
      outOfReach: sources.tentacle.outOfReach,
      pois: sources.tentacle.pois,
    },
    thermometer: {
      thermoA: sources.thermometer.thermoA,
      thermoB: sources.thermometer.thermoB,
      answer: sources.thermometer.answer,
      targetDistanceMeters: sources.thermometer.targetDistanceMeters,
      walkCurrentPoint: sources.thermometer.walkCurrentPoint,
      walkActive: sources.thermometer.walkActive,
    },
    measuring: {
      seekerPoint: sources.measuring.seekerPoint,
      targetPoint: sources.measuring.targetPoint,
      eliminationPreview: sources.measuring.eliminationPreview !== null,
      seekerResolving: sources.measuring.seekerResolving,
    },
    matching: {
      seekerPoint: sources.matching.seekerPoint,
      nearestFeaturePoint: sources.matching.nearestFeaturePoint,
      eliminationPreview: sources.matching.eliminationPreview !== null,
      seekerResolving: sources.matching.seekerResolving,
    },
    zone: { vertices: sources.zone.vertices },
  };
}
