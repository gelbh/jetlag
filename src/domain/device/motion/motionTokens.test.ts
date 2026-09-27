import { describe, expect, it } from "vitest";
import {
  MIN_DRAG_START_PX,
  MOTION_SHEET_PRESENT_MS,
  PANEL_SNAP_FRACTION,
  SHEET_DISMISS_FRACTION,
} from "./motionTokens";

describe("motionTokens", () => {
  it("exports shared drag thresholds", () => {
    expect(MIN_DRAG_START_PX).toBe(6);
    expect(SHEET_DISMISS_FRACTION).toBe(0.28);
    expect(PANEL_SNAP_FRACTION).toBe(0.32);
  });

  it("exports sheet present duration matching --motion-sheet-present", () => {
    expect(MOTION_SHEET_PRESENT_MS).toBe(380);
  });
});
