import {
  applyMonitorStackGeometry,
  clampMonitorLayoutToCols,
  type MonitorLayout,
  type StackGeometryItem,
} from "../../domain/admin/opsDeskLayout";

/** Apply nested RGL geometry then clamp so stacks never exceed cols (no H-scroll). */
export function commitMonitorWorkspaceGeometry(
  layout: MonitorLayout,
  next: readonly StackGeometryItem[],
): MonitorLayout {
  return clampMonitorLayoutToCols(applyMonitorStackGeometry(layout, next));
}
