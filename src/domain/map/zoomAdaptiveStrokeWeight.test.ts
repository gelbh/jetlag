import { describe, expect, it } from "vitest";
import {
  computeZoomAdaptiveWeight,
  quantizeWeight,
  scaleDashArray,
} from "./zoomAdaptiveStrokeWeight";

describe("computeZoomAdaptiveWeight", () => {
  it("returns base weight at the reference zoom", () => {
    expect(computeZoomAdaptiveWeight(2, 12)).toBe(2);
  });

  it("thins strokes at low zoom and thickens at high zoom", () => {
    const low = computeZoomAdaptiveWeight(2, 4);
    const high = computeZoomAdaptiveWeight(2, 16);
    expect(low).toBeLessThan(2);
    expect(high).toBeGreaterThan(2);
  });

  it("clamps to min and max", () => {
    expect(
      computeZoomAdaptiveWeight(2, 1, { minWeight: 1, maxWeight: 3 }),
    ).toBe(1);
    expect(
      computeZoomAdaptiveWeight(2, 40, { minWeight: 1, maxWeight: 3 }),
    ).toBe(3);
  });
});

describe("quantizeWeight", () => {
  it("rounds to the nearest 0.5", () => {
    expect(quantizeWeight(2.24)).toBe(2);
    expect(quantizeWeight(2.25)).toBe(2.5);
    expect(quantizeWeight(2.74)).toBe(2.5);
    expect(quantizeWeight(2.75)).toBe(3);
  });
});

describe("scaleDashArray", () => {
  it("scales dash segments with weight", () => {
    expect(scaleDashArray("8 6", 1.5, 3)).toBe("4 3");
    expect(scaleDashArray("8 6", 6, 3)).toBe("16 12");
  });

  it("keeps a minimum dash segment of 1", () => {
    expect(scaleDashArray("8 6", 0.5, 3)).toBe("1 1");
  });
});
