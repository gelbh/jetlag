export {
  FIT_BOUNDS_PADDING_PX,
  MAX_ZOOM_PIN,
  MAX_ZOOM_RADAR_CENTER,
  MOTION_MAP_CAMERA_MS,
  PANEL_PADDING_EXTRA_PX,
  PADDING_FRACTION,
  PADDING_MAX_METERS,
  PADDING_MIN_METERS,
  PIN_MIN_SPAN_METERS,
  RADAR_MIN_SPAN_FACTOR,
  SAFE_RECT_FRACTION,
  WALK_REFRAME_INTERVAL_MS,
} from "./constants";

export {
  approximatePlayAreaContextMinZoom,
  boundsForCircle,
  boundsForGeoJsonFeatures,
  boundsForPinPoint,
  boundsForPlayArea,
  boundsForRadarCircle,
  boundsForTwoPoints,
  boundsForVertexPolygon,
  boundingBoxToBoundsExpression,
  proportionalPaddingMeters,
  unionBounds,
} from "./bounds";

export { placementCameraDraftFromOverlaySources } from "./draftFromSources";
export { computePlacementCameraTarget } from "./computePlacementCameraTarget";
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
