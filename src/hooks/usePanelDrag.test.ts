import { describe, expect, it } from "vitest";
import {
  PANEL_MINIMIZE_DRAG_THRESHOLD_PX,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  shouldMinimizePanelDrag,
} from "./usePanelDrag";

describe("usePanelDrag", () => {
  it("minimizes when dragged past the threshold", () => {
    expect(shouldMinimizePanelDrag(PANEL_MINIMIZE_DRAG_THRESHOLD_PX, 0)).toBe(
      true,
    );
    expect(
      shouldMinimizePanelDrag(PANEL_MINIMIZE_DRAG_THRESHOLD_PX - 1, 0),
    ).toBe(false);
  });

  it("minimizes on a fast downward flick", () => {
    expect(
      shouldMinimizePanelDrag(
        0,
        PANEL_MINIMIZE_VELOCITY_PX_MS + 0.05,
      ),
    ).toBe(true);
  });
});
