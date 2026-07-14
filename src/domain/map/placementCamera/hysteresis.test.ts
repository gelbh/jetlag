import { describe, expect, it } from "vitest";
import {
  computeSafeRectBounds,
  isTargetInsideSafeRect,
  shouldApplyHysteresis,
  shouldReframeWithHysteresis,
} from "./hysteresis";
import type { PlacementViewportFrame } from "./types";

const viewportFrame: PlacementViewportFrame = {
  bounds: {
    south: 53.34,
    west: -6.28,
    north: 53.36,
    east: -6.24,
  },
  widthPx: 400,
  heightPx: 800,
  bottomPaddingPx: 120,
};

describe("hysteresis", () => {
  it("applies hysteresis only for walk updates and POI switches", () => {
    expect(
      shouldApplyHysteresis({
        phase: "pick_second_point",
        walkActive: true,
        poiSelectionChange: false,
        forceReframe: false,
        targetBounds: null,
        viewportFrame,
      }),
    ).toBe(true);

    expect(
      shouldApplyHysteresis({
        phase: "pick_poi",
        walkActive: false,
        poiSelectionChange: true,
        forceReframe: false,
        targetBounds: null,
        viewportFrame,
      }),
    ).toBe(true);

    expect(
      shouldApplyHysteresis({
        phase: "pick_radius",
        walkActive: false,
        poiSelectionChange: false,
        forceReframe: false,
        targetBounds: null,
        viewportFrame,
      }),
    ).toBe(false);
  });

  it("skips reframe when target stays inside the safe rect during POI switch", () => {
    const safeRect = computeSafeRectBounds(viewportFrame);
    const innerTarget = {
      south: safeRect.south + 0.0005,
      west: safeRect.west + 0.0005,
      north: safeRect.north - 0.0005,
      east: safeRect.east - 0.0005,
    };

    expect(isTargetInsideSafeRect(innerTarget, viewportFrame)).toBe(true);
    expect(
      shouldReframeWithHysteresis({
        phase: "pick_poi",
        walkActive: false,
        poiSelectionChange: true,
        forceReframe: false,
        targetBounds: innerTarget,
        viewportFrame,
      }),
    ).toBe(false);
  });

  it("always reframes on forceReframe and phase transitions without hysteresis", () => {
    expect(
      shouldReframeWithHysteresis({
        phase: "answered",
        walkActive: false,
        poiSelectionChange: false,
        forceReframe: true,
        targetBounds: null,
        viewportFrame,
      }),
    ).toBe(true);

    expect(
      shouldReframeWithHysteresis({
        phase: "pick_radius",
        walkActive: false,
        poiSelectionChange: false,
        forceReframe: false,
        targetBounds: null,
        viewportFrame,
      }),
    ).toBe(true);
  });

  it("reframes when POI target lies outside the safe rect", () => {
    const outerTarget = {
      south: viewportFrame.bounds.south - 0.01,
      west: viewportFrame.bounds.west - 0.01,
      north: viewportFrame.bounds.south,
      east: viewportFrame.bounds.west,
    };

    expect(
      shouldReframeWithHysteresis({
        phase: "pick_poi",
        walkActive: false,
        poiSelectionChange: true,
        forceReframe: false,
        targetBounds: outerTarget,
        viewportFrame,
      }),
    ).toBe(true);
  });
});
