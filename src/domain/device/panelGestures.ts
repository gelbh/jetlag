export {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../../hooks/useSheetGesture";
export {
  PANEL_MINIMIZE_DRAG_THRESHOLD_PX,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
} from "../../hooks/usePanelDrag";

/** Shared swipe-down dismiss threshold for full overlays (28% of sheet height). */
export const OVERLAY_DISMISS_FRACTION = 0.28;

/** Shared velocity threshold for overlay dismiss (px/ms). */
export const OVERLAY_DISMISS_VELOCITY_PX_MS = 0.45;

/** Shared drag threshold for tool panel minimize (px). */
export const TOOL_PANEL_MINIMIZE_THRESHOLD_PX = 72;

/** Shared velocity threshold for tool panel minimize (px/ms). */
export const TOOL_PANEL_MINIMIZE_VELOCITY_PX_MS = 0.35;
