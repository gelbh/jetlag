import { describe, expect, it } from "vitest";
import { MIN_DRAG_START_PX } from "../domain/device/motionTokens";
import {
  computeDragOffset,
  hasExceededDragSlop,
} from "./useInteractiveDragY";

describe("useInteractiveDragY helpers", () => {
  it("maps delta through mapDelta without slop gating", () => {
    const mapDelta = (delta: number) => Math.max(0, delta);
    expect(computeDragOffset(2, MIN_DRAG_START_PX, mapDelta)).toBe(2);
    expect(computeDragOffset(10, MIN_DRAG_START_PX, mapDelta)).toBe(10);
  });

  it("passes startOffset into mapDelta", () => {
    const mapDelta = (delta: number, start: number) => start + delta;
    expect(computeDragOffset(5, MIN_DRAG_START_PX, mapDelta, 12)).toBe(17);
  });

  it("detects slop separately from visual offset", () => {
    expect(hasExceededDragSlop(5, MIN_DRAG_START_PX)).toBe(false);
    expect(hasExceededDragSlop(6, MIN_DRAG_START_PX)).toBe(true);
    expect(hasExceededDragSlop(-6, MIN_DRAG_START_PX)).toBe(true);
  });
});
