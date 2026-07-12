import type { MapDraftOverlaySources } from "../map-screen/useMapDraftOverlays";
import type { GameArea } from "../../domain/map/annotations";

export function tutorialMapDraftBase(
  gameArea: GameArea,
): Omit<MapDraftOverlaySources, "activeTool"> {
  return {
    gameArea,
    mapStyle: "standard",
    radar: { center: null, radiusMeters: 0, answer: null },
    pin: { point: null },
    tentacle: {
      center: null,
      searchRadiusMeters: 0,
      answerRadiusMeters: 0,
      pois: [],
      selectedPoiId: null,
      outOfReach: false,
      seekerResolving: false,
    },
    thermometer: { thermoA: null, thermoB: null, answer: null },
    measuring: {
      seekerPoint: null,
      targetPoint: null,
      placePoints: [],
      siteRadiusMeters: null,
      boundaryPreview: null,
      eliminationPreview: null,
      seekerResolving: false,
    },
    matching: {
      seekerPoint: null,
      nearestFeaturePoint: null,
      boundaryPreview: null,
      eliminationPreview: null,
      seekerResolving: false,
    },
    zone: { vertices: [] },
  };
}
