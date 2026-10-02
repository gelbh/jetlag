export { toMapBounds } from "../mapBounds";

export {
  approximatePlayAreaContextMinZoom,
  boundingBoxToBoundsExpression,
  boundsForCircle,
  boundsForGeoJsonFeatures,
  boundsForPinPoint,
  boundsForPlayArea,
  boundsForRadarCircle,
  boundsForTwoPoints,
  boundsForVertexPolygon,
  proportionalPaddingMeters,
  unionBounds,
} from "./bounds";
export { computePlacementCameraTarget } from "./computePlacementCameraTarget";
export {
  FIT_BOUNDS_PADDING_PX,
  MAX_ZOOM_PIN,
  MAX_ZOOM_RADAR_CENTER,
  MOTION_MAP_CAMERA_MS,
  PADDING_FRACTION,
  PADDING_MAX_METERS,
  PADDING_MIN_METERS,
  PANEL_PADDING_EXTRA_PX,
  PIN_MIN_SPAN_METERS,
  RADAR_MIN_SPAN_FACTOR,
  SAFE_RECT_FRACTION,
  WALK_REFRAME_INTERVAL_MS,
} from "./constants";
export { placementCameraDraftFromOverlaySources } from "./draftFromSources";
export { placementCameraFingerprint } from "./fingerprint";
export {
  computeSafeRectBounds,
  isTargetInsideSafeRect,
  shouldApplyHysteresis,
  shouldReframeWithHysteresis,
} from "./hysteresis";
export { resolvePlacementPhase } from "./resolvePlacementPhase";

export type {
  CameraTarget,
  PlacementCameraContext,
  PlacementCameraDraftState,
  PlacementPhase,
  PlacementViewportFrame,
} from "./types";
