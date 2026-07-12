export {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../../hooks/useSheetGesture";
export {
  PANEL_SNAP_FRACTION,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  PANEL_EXPAND_VELOCITY_PX_MS,
  PANEL_PEEK_HEIGHT_PX_EXPORT as PANEL_PEEK_HEIGHT_PX,
} from "../../hooks/usePanelDrag";

/** Shared swipe-down dismiss threshold for full overlays (28% of sheet height). */
export const OVERLAY_DISMISS_FRACTION = 0.28;

/** Shared velocity threshold for overlay dismiss (px/ms). */
export const OVERLAY_DISMISS_VELOCITY_PX_MS = 0.45;

/** Shared drag threshold for tool panel minimize (px). @deprecated Use PANEL_SNAP_FRACTION */
export const TOOL_PANEL_MINIMIZE_THRESHOLD_PX = 72;

/** Shared velocity threshold for tool panel minimize (px/ms). */
export const TOOL_PANEL_MINIMIZE_VELOCITY_PX_MS = 0.35;

export {
  WIZARD_SWIPE_AXIS_SLOP_PX,
  WIZARD_SWIPE_COMMIT_FRACTION,
  WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS,
} from "../../hooks/useWizardSwipe";
