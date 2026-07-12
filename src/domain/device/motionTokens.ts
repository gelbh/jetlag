/** Shared pointer-drag thresholds and motion transition strings. */

export const MIN_DRAG_START_PX = 6;

export const SHEET_DISMISS_FRACTION = 0.28;
export const SHEET_VELOCITY_DISMISS_PX_MS = 0.45;

export const PANEL_SNAP_FRACTION = 0.28;
export const PANEL_MINIMIZE_VELOCITY_PX_MS = 0.35;
export const PANEL_EXPAND_VELOCITY_PX_MS = 0.35;
export const PANEL_PEEK_HEIGHT_PX = 44;
export const DEFAULT_PANEL_HEIGHT_PX = 320;

export const OVERLAY_DISMISS_FRACTION = 0.28;
export const OVERLAY_DISMISS_VELOCITY_PX_MS = 0.45;

export const WIZARD_SWIPE_AXIS_SLOP_PX = 8;
export const WIZARD_SWIPE_COMMIT_FRACTION = 0.35;
export const WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS = 0.35;

export const MOTION_TRANSITION_SHEET =
  "transform var(--motion-sheet) var(--ease-spring-subtle)";
export const MOTION_TRANSITION_BASE =
  "transform var(--motion-base) var(--ease-spring-subtle)";
export const MOTION_TRANSITION_SCRIM =
  "opacity var(--motion-fast) var(--ease-out-quint)";
