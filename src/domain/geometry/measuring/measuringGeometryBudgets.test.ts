import { describe, expect, it } from "vitest";
import {
  MEASURING_LINEAR_MAX_VERTICES,
  MEASURING_MULTI_PLACE_MAX,
  assertMeasuringLinearVertexBudget,
  assertMeasuringMultiPlaceBudget,
  countLineStringVertices,
} from "./measuringGeometryBudgets";

describe("measuringGeometryBudgets", () => {
  it("allows 107 and 128 multi-place counts", () => {
    expect(assertMeasuringMultiPlaceBudget(107).ok).toBe(true);
    expect(assertMeasuringMultiPlaceBudget(MEASURING_MULTI_PLACE_MAX).ok).toBe(
      true,
    );
  });

  it("rejects 129 multi-place with the locked copy", () => {
    const result = assertMeasuringMultiPlaceBudget(129);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Too many places/);
    }
  });

  it("rejects linear vertex totals over the locked max", () => {
    const result = assertMeasuringLinearVertexBudget(
      MEASURING_LINEAR_MAX_VERTICES + 1,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/too detailed/);
    }
  });

  it("counts LineString vertices across segments", () => {
    expect(
      countLineStringVertices([
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
              [2, 2],
            ],
          },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 0],
            ],
          },
        },
      ]),
    ).toBe(5);
  });
});
