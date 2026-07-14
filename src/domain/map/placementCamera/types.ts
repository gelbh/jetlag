import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import type { BoundingBox } from "../../geometry/gameAreaBounds";
import type { LatLngTuple } from "../../geometry/geometry";
import type { GameArea } from "../annotations";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import type { MapTool } from "../mapToolTypes";
import type { RadarAnswer } from "../../questions";
import type { ThermometerAnswer } from "../../questions";

export type PlacementPhase =
  | "idle"
  | "pick_center"
  | "pick_radius"
  | "pick_second_point"
  | "pick_poi"
  | "await_answer"
  | "answered";

export interface CameraTarget {
  bounds: LatLngBoundsExpression;
  minZoom?: number;
  maxZoom?: number;
  paddingBiasPx?: number;
  animate?: boolean;
  /** When true, skip hysteresis (phase transitions, Recenter). */
  forceReframe?: boolean;
}

export interface PlacementCameraDraftState {
  radar: {
    center: LatLngTuple | null;
    radiusMeters: number;
    answer: RadarAnswer | null;
  };
  pin: { point: LatLngTuple | null };
  tentacle: {
    center: LatLngTuple | null;
    searchRadiusMeters: number;
    answerRadiusMeters: number;
    selectedPoiId: string | null;
    outOfReach: boolean;
    pois: readonly { id: string; lat: number; lng: number }[];
  };
  thermometer: {
    thermoA: LatLngTuple | null;
    thermoB: LatLngTuple | null;
    answer: ThermometerAnswer | null;
    targetDistanceMeters: number;
    walkCurrentPoint: LatLngTuple | null;
    walkActive: boolean;
  };
  measuring: {
    seekerPoint: LatLngTuple | null;
    targetPoint: LatLngTuple | null;
    eliminationPreview: boolean;
    seekerResolving: boolean;
  };
  matching: {
    seekerPoint: LatLngTuple | null;
    nearestFeaturePoint: LatLngTuple | null;
    eliminationPreview: boolean;
    seekerResolving: boolean;
  };
  zone: { vertices: LatLngTuple[] };
}

export interface PlacementViewportFrame {
  bounds: BoundingBox;
  widthPx: number;
  heightPx: number;
  bottomPaddingPx: number;
}

export interface PlacementCameraContext {
  tool: MapTool;
  phase: PlacementPhase;
  draft: PlacementCameraDraftState;
  gameArea: GameArea;
  overlays: readonly MapDraftOverlay[];
  eliminationFeatures: Feature<Polygon | MultiPolygon>[];
  panelPeekHeightPx: number;
  selectedPoiId?: string | null;
  walkActive?: boolean;
  viewportFrame?: PlacementViewportFrame | null;
  forceReframe?: boolean;
}
