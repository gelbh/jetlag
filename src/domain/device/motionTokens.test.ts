import { describe, expect, it } from "vitest";
import {
  MIN_DRAG_START_PX,
  PANEL_SNAP_FRACTION,
  SHEET_DISMISS_FRACTION,
} from "./motionTokens";

describe("motionTokens", () => {
  it("exports shared drag thresholds", () => {
    expect(MIN_DRAG_START_PX).toBe(6);
    expect(SHEET_DISMISS_FRACTION).toBe(0.28);
    expect(PANEL_SNAP_FRACTION).toBe(0.28);
  });
});
