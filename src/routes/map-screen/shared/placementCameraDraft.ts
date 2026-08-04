import type {
  PlacementCameraDraftState,
} from "@/domain/map/placementCamera";

type ToolDraftSlice = {
  radar: {
    radarCenter: PlacementCameraDraftState["radar"]["center"];
    radarRadius: number | null;
    radarAnswer: PlacementCameraDraftState["radar"]["answer"];
  };
  pin: { pinPoint: PlacementCameraDraftState["pin"]["point"] };
  tentacle: {
    tentacleCenter: PlacementCameraDraftState["tentacle"]["center"];
    tentacleSearchRadiusMeters: number | null;
    tentacleAnswerRadiusMeters: number | null;
    tentacleSelectedPoiId: PlacementCameraDraftState["tentacle"]["selectedPoiId"];
    tentacleOutOfReach: boolean;
    tentaclePois: PlacementCameraDraftState["tentacle"]["pois"];
  };
  thermometer: {
    thermoA: PlacementCameraDraftState["thermometer"]["thermoA"];
    thermoB: PlacementCameraDraftState["thermometer"]["thermoB"];
    thermometerAnswer: PlacementCameraDraftState["thermometer"]["answer"];
    thermometerDistanceMeters: number;
    walkingQuestionId: string | null;
  };
  measuring: {
    measuringSeekerPoint: PlacementCameraDraftState["measuring"]["seekerPoint"];
    measuringTargetPoint: PlacementCameraDraftState["measuring"]["targetPoint"];
    measuringEliminationPreview: unknown;
    seekerResolving: boolean;
  };
  matching: {
    matchingSeekerPoint: PlacementCameraDraftState["matching"]["seekerPoint"];
    matchingNearestFeaturePoint: PlacementCameraDraftState["matching"]["nearestFeaturePoint"];
    matchingEliminationPreview: unknown;
    seekerResolving: boolean;
  };
  zone: { zoneVertices: PlacementCameraDraftState["zone"]["vertices"] };
};

export function buildPlacementCameraDraft(input: {
  deferredTentacleSelectedPoiId: PlacementCameraDraftState["tentacle"]["selectedPoiId"];
  walkCurrentPoint: PlacementCameraDraftState["thermometer"]["walkCurrentPoint"];
  drafts: ToolDraftSlice;
}): PlacementCameraDraftState {
  const { deferredTentacleSelectedPoiId, walkCurrentPoint, drafts } = input;
  return {
    radar: {
      center: drafts.radar.radarCenter,
      radiusMeters: drafts.radar.radarRadius ?? 0,
      answer: drafts.radar.radarAnswer,
    },
    pin: { point: drafts.pin.pinPoint },
    tentacle: {
      center: drafts.tentacle.tentacleCenter,
      searchRadiusMeters: drafts.tentacle.tentacleSearchRadiusMeters ?? 0,
      answerRadiusMeters: drafts.tentacle.tentacleAnswerRadiusMeters ?? 0,
      selectedPoiId: deferredTentacleSelectedPoiId,
      outOfReach: drafts.tentacle.tentacleOutOfReach,
      pois: drafts.tentacle.tentaclePois,
    },
    thermometer: {
      thermoA: drafts.thermometer.thermoA,
      thermoB: drafts.thermometer.thermoB,
      answer: drafts.thermometer.thermometerAnswer,
      targetDistanceMeters: drafts.thermometer.thermometerDistanceMeters,
      walkCurrentPoint,
      walkActive: drafts.thermometer.walkingQuestionId !== null,
    },
    measuring: {
      seekerPoint: drafts.measuring.measuringSeekerPoint,
      targetPoint: drafts.measuring.measuringTargetPoint,
      eliminationPreview: drafts.measuring.measuringEliminationPreview !== null,
      seekerResolving: drafts.measuring.seekerResolving,
    },
    matching: {
      seekerPoint: drafts.matching.matchingSeekerPoint,
      nearestFeaturePoint: drafts.matching.matchingNearestFeaturePoint,
      eliminationPreview: drafts.matching.matchingEliminationPreview !== null,
      seekerResolving: drafts.matching.seekerResolving,
    },
    zone: { vertices: drafts.zone.zoneVertices },
  };
}
