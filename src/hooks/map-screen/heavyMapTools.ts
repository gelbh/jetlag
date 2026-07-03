import type { ReactNode } from "react";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngTuple } from "../../domain/geometry";
import type { MeasuringPlace } from "../../services/measuringPlaces";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "../../domain/tentacleQuestions";
import type { TentaclePoi } from "../../domain/annotations";

export interface MatchingToolApi {
  draft: {
    matchingSeekerPoint: LatLngTuple | null;
    matchingNearestFeaturePoint: LatLngTuple | null;
    matchingBoundaryPreview: Feature<Polygon | MultiPolygon> | null;
    matchingEliminationPreview: Feature<Polygon | MultiPolygon> | null;
  };
  placementCrosshair: boolean;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
}

export interface MeasuringToolApi {
  draft: {
    measuringSeekerPoint: LatLngTuple | null;
    measuringTargetPoint: LatLngTuple | null;
    measuringPlaces: MeasuringPlace[];
    measuringDistanceMeters: number | null;
    measuringBoundaryPreview: Feature<Polygon | MultiPolygon> | null;
    measuringEliminationPreview: Feature<Polygon | MultiPolygon> | null;
  };
  placementCrosshair: boolean;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
}

export interface TentacleToolApi {
  draft: {
    tentacleCenter: LatLngTuple | null;
    tentacleSearchRadiusMeters: number;
    tentacleAnswerRadiusMeters: number;
    tentaclePois: TentaclePoi[];
    tentacleSelectedPoiId: string | null;
    tentacleOutOfReach: boolean;
    tentacleEliminationPreview: Feature<Polygon | MultiPolygon> | null;
  };
  placementCrosshair: boolean;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
}

export interface HeavyMapToolsApi {
  matchingTool: MatchingToolApi;
  measuringTool: MeasuringToolApi;
  tentacleTool: TentacleToolApi;
}

function noopMapClick(): void {}

export function createIdleHeavyMapTools(): HeavyMapToolsApi {
  const idleMatchingTool: MatchingToolApi = {
    draft: {
      matchingSeekerPoint: null,
      matchingNearestFeaturePoint: null,
      matchingBoundaryPreview: null,
      matchingEliminationPreview: null,
    },
    placementCrosshair: false,
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
  };

  const idleMeasuringTool: MeasuringToolApi = {
    draft: {
      measuringSeekerPoint: null,
      measuringTargetPoint: null,
      measuringPlaces: [],
      measuringDistanceMeters: null,
      measuringBoundaryPreview: null,
      measuringEliminationPreview: null,
    },
    placementCrosshair: false,
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
  };

  const idleTentacleTool: TentacleToolApi = {
    draft: {
      tentacleCenter: null,
      tentacleSearchRadiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
      tentacleAnswerRadiusMeters: TENTACLE_ANSWER_RADIUS_METERS,
      tentaclePois: [],
      tentacleSelectedPoiId: null,
      tentacleOutOfReach: false,
      tentacleEliminationPreview: null,
    },
    placementCrosshair: false,
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
  };

  return {
    matchingTool: idleMatchingTool,
    measuringTool: idleMeasuringTool,
    tentacleTool: idleTentacleTool,
  };
}
