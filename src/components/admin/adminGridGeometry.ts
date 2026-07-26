import {
  applyStackGeometry,
  clampLayoutToCols,
  type DeskLayout,
  type StackGeometryItem,
} from "../../domain/admin/opsDeskLayout";

/** Apply RGL geometry then clamp so stacks never exceed cols (no H-scroll). */
export function commitWorkspaceGeometry(
  layout: DeskLayout,
  next: readonly StackGeometryItem[],
): DeskLayout {
  return clampLayoutToCols(applyStackGeometry(layout, next));
}
