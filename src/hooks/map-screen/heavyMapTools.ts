import type { ReactNode } from "react";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { AskHudReadiness } from "../../domain/ask/askHudModes";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { MeasuringPlace } from "../../services/geo/overpass/measuringPlaces";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "../../domain/questions";
import type { TentaclePoi } from "../../domain/map/annotations";

/** Ask Map HUD bundle returned by migrated question tools. */
export type AskToolHudBundle = {
  readiness: AskHudReadiness;
  costLabel: string;
  error: string | null;
  onCommit: () => void;
  modeBody: ReactNode;
  sheets: ReactNode;
};

export interface MatchingToolApi {
  draft: {
    matchingSeekerPoint: LatLngTuple | null;
    matchingNearestFeaturePoint: LatLngTuple | null;
    matchingBoundaryPreview: Feature<Polygon | MultiPolygon> | null;
    matchingEliminationPreview: Feature<Polygon | MultiPolygon> | null;
    seekerResolving: boolean;
  };
  placementCrosshair: boolean;
  /** Includes answer — draft JSON alone skips republish when Yes/No changes. */
  publishSignature: string;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
  hud: AskToolHudBundle;
}

export interface MeasuringToolApi {
  draft: {
    measuringSeekerPoint: LatLngTuple | null;
    measuringTargetPoint: LatLngTuple | null;
    measuringPlaces: MeasuringPlace[];
    measuringDistanceMeters: number | null;
    measuringBoundaryPreview: Feature<Polygon | MultiPolygon> | null;
    measuringEliminationPreview: Feature<Polygon | MultiPolygon> | null;
    seekerResolving: boolean;
  };
  placementCrosshair: boolean;
  publishSignature: string;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
  hud: AskToolHudBundle;
}

export interface TentacleToolApi {
  draft: {
    tentacleCenter: LatLngTuple | null;
    tentacleSearchRadiusMeters: number;
    tentacleAnswerRadiusMeters: number;
    tentaclePois: TentaclePoi[];
    tentacleSelectedPoiId: string | null;
    tentacleOutOfReach: boolean;
    seekerResolving: boolean;
  };
  placementCrosshair: boolean;
  handleMapClick: (point: LatLngTuple) => void;
  resetDraft: () => void;
  panel: ReactNode;
  hud: AskToolHudBundle;
}

export interface HeavyMapToolsApi {
  matchingTool: MatchingToolApi;
  measuringTool: MeasuringToolApi;
  tentacleTool: TentacleToolApi;
}

function noopMapClick(): void {}

const idleMatchingHud: AskToolHudBundle = {
  readiness: {
    surface: "matching",
    placementReady: false,
    configureReady: false,
    resolveReady: false,
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
  },
  costLabel: "D3P1",
  error: null,
  onCommit: () => undefined,
  modeBody: null,
  sheets: null,
};

const idleMeasuringHud: AskToolHudBundle = {
  readiness: {
    surface: "measuring",
    placementReady: false,
    configureReady: false,
    resolveReady: false,
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
  },
  costLabel: "D3P1",
  error: null,
  onCommit: () => undefined,
  modeBody: null,
  sheets: null,
};

const idleTentacleHud: AskToolHudBundle = {
  readiness: {
    surface: "tentacle",
    placementReady: false,
    configureReady: false,
    resolveReady: false,
    answerReady: true,
    awaitHiderAnswer: true,
    isSubmitting: false,
  },
  costLabel: "D4P2",
  error: null,
  onCommit: () => undefined,
  modeBody: null,
  sheets: null,
};

export function createIdleHeavyMapTools(): HeavyMapToolsApi {
  const idleMatchingTool: MatchingToolApi = {
    draft: {
      matchingSeekerPoint: null,
      matchingNearestFeaturePoint: null,
      matchingBoundaryPreview: null,
      matchingEliminationPreview: null,
      seekerResolving: false,
    },
    placementCrosshair: false,
    publishSignature: "idle",
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
    hud: idleMatchingHud,
  };

  const idleMeasuringTool: MeasuringToolApi = {
    draft: {
      measuringSeekerPoint: null,
      measuringTargetPoint: null,
      measuringPlaces: [],
      measuringDistanceMeters: null,
      measuringBoundaryPreview: null,
      measuringEliminationPreview: null,
      seekerResolving: false,
    },
    placementCrosshair: false,
    publishSignature: "idle",
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
    hud: idleMeasuringHud,
  };

  const idleTentacleTool: TentacleToolApi = {
    draft: {
      tentacleCenter: null,
      tentacleSearchRadiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
      tentacleAnswerRadiusMeters: TENTACLE_ANSWER_RADIUS_METERS,
      tentaclePois: [],
      tentacleSelectedPoiId: null,
      tentacleOutOfReach: false,
      seekerResolving: false,
    },
    placementCrosshair: false,
    handleMapClick: noopMapClick,
    resetDraft: () => undefined,
    panel: null,
    hud: idleTentacleHud,
  };

  return {
    matchingTool: idleMatchingTool,
    measuringTool: idleMeasuringTool,
    tentacleTool: idleTentacleTool,
  };
}
