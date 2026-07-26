/** Shared pointer-drag thresholds and motion transition strings. */

export const MIN_DRAG_START_PX = 6;

export const SHEET_DISMISS_FRACTION = 0.28;
export const SHEET_VELOCITY_DISMISS_PX_MS = 0.45;

export const PANEL_SNAP_FRACTION = 0.32;
export const PANEL_MINIMIZE_VELOCITY_PX_MS = 0.4;
export const PANEL_EXPAND_VELOCITY_PX_MS = 0.4;
export const PANEL_PEEK_HEIGHT_PX = 44;
export const DEFAULT_PANEL_HEIGHT_PX = 320;

export const OVERLAY_DISMISS_FRACTION = 0.28;
export const OVERLAY_DISMISS_VELOCITY_PX_MS = 0.45;

export const WIZARD_SWIPE_AXIS_SLOP_PX = 8;
export const WIZARD_SWIPE_COMMIT_FRACTION = 0.35;
export const WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS = 0.35;

export const MOTION_TRANSITION_SHEET =
  "transform var(--motion-sheet-present) var(--ease-ios-standard)";
export const MOTION_TRANSITION_PANEL = MOTION_TRANSITION_SHEET;
export const MOTION_TRANSITION_BASE =
  "transform var(--motion-base) var(--ease-spring-subtle)";
export const MOTION_TRANSITION_SCRIM =
  "opacity var(--motion-fast) var(--ease-out-quint)";

/** Small placement reframe duration (walk/POI updates, radius edits); sits
 * just above `--motion-base` in base.css. */
export const MOTION_MAP_CAMERA_MS = 250;

/** Small placement reframe duration in seconds. */
export const MOTION_MAP_CAMERA_S = MOTION_MAP_CAMERA_MS / 1000;

/** Large placement reframe duration (phase transitions, answers, Recenter) —
 * cinematic `flyTo`, must stay well under 600ms to feel responsive outdoors. */
export const MOTION_MAP_CAMERA_FLY_MS = 450;

/** Large placement reframe duration in seconds. */
export const MOTION_MAP_CAMERA_FLY_S = MOTION_MAP_CAMERA_FLY_MS / 1000;

/** Minimum zoom-level change that classifies a reframe as a large jump (fly). */
export const MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA = 1.5;

/** Minimum center movement, as a fraction of viewport span, that classifies a
 * reframe as a large jump (fly). */
export const MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION = 0.3;

/** Extra bottom padding when framing tool placement (panel peek + dock). */
export const MAP_PLACEMENT_FOCUS_BOTTOM_BIAS_PX = 120;
