import { describe, expect, it } from "vitest";
import {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
  shouldDismissSheetDrag,
} from "./useSheetGesture";

describe("useSheetGesture", () => {
  it("dismisses when dragged past the fraction threshold", () => {
    expect(shouldDismissSheetDrag(100, 320, 0)).toBe(true);
    expect(shouldDismissSheetDrag(80, 320, 0)).toBe(false);
  });

  it("dismisses on a fast downward flick", () => {
    expect(
      shouldDismissSheetDrag(10, 320, SHEET_VELOCITY_DISMISS_PX_MS + 0.1),
    ).toBe(true);
  });

  it("exports stable dismiss constants", () => {
    expect(SHEET_DISMISS_FRACTION).toBeGreaterThan(0);
    expect(SHEET_VELOCITY_DISMISS_PX_MS).toBeGreaterThan(0);
  });
});
