/** Pinned placement-camera constants — keep in sync with design spec. */

export const PADDING_FRACTION = 0.12;
export const PADDING_MIN_METERS = 80;
export const PADDING_MAX_METERS = 800;

export const PIN_MIN_SPAN_METERS = 120;
export const RADAR_MIN_SPAN_FACTOR = 2.2;

export const SAFE_RECT_FRACTION = 0.7;

export const MAX_ZOOM_PIN = 16;
export const MAX_ZOOM_RADAR_CENTER = 16;

export const FIT_BOUNDS_PADDING_PX: [number, number] = [32, 32];
export const PANEL_PADDING_EXTRA_PX = 24;

export const WALK_REFRAME_INTERVAL_MS = 2000;

export { MOTION_MAP_CAMERA_MS } from "../../device/motionTokens";

/** Target bounds must span at least this fraction of play-area width to skip minZoom. */
export const PLAY_AREA_CONTEXT_MIN_WIDTH_FRACTION = 0.4;
