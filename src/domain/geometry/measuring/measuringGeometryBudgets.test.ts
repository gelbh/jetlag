import { describe, expect, it } from "vitest";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  MEASURING_LINEAR_MAX_VERTICES,
  MEASURING_MULTI_PLACE_MAX,
  MEASURING_OUTPUT_MAX_JSON_CHARS,
  MEASURING_OUTPUT_MAX_VERTICES,
  MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
  assertMeasuringGeometryBudget,
  assertMeasuringLinearVertexBudget,
  assertMeasuringMultiPlaceBudget,
  assertMeasuringOutputComplexityBudget,
  countLineStringVertices,
  countPolygonVertices,
  measuringGeometryJsonChars,
  softenMeasuringOutputToBudget,
} from "./measuringGeometryBudgets";

/** Dense zigzag ring — simplify can reduce verts under the output cap. */
function denseZigzagPolygon(vertexCount: number): Feature<Polygon> {
  const ring: number[][] = [];
  const n = Math.max(4, vertexCount - 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    ring.push([-6.3 + t * 0.05, 53.3 + (i % 2 === 0 ? 0.00001 : -0.00001)]);
  }
  ring.push(ring[0]!);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

/**
 * Many well-separated unit squares — Turf simplify cannot collapse under the
 * output cap (RLBT golf-closer class: ~8k verts that stay heavy).
 */
function separateSquaresMultiPolygon(
  squareCount: number,
): Feature<MultiPolygon> {
  const polygons: number[][][][] = [];
  for (let i = 0; i < squareCount; i++) {
    const x = -6.5 + (i % 80) * 0.05;
    const y = 53.0 + Math.floor(i / 80) * 0.05;
    polygons.push([
      [
        [x, y],
        [x + 0.02, y],
        [x + 0.02, y + 0.02],
        [x, y + 0.02],
        [x, y],
      ],
    ]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
}

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

  it("gates multi-place via assertMeasuringGeometryBudget", () => {
    expect(
      assertMeasuringGeometryBudget({
        measuringSubject: "location",
        measuringLocationCategory: "park",
        usesAllPlacesInArea: true,
        placeCount: 129,
        linearSegments: [],
      }).ok,
    ).toBe(false);
  });

  it("gates linear categories via prepared vertex count", () => {
    const fatSegment = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: Array.from({ length: MEASURING_LINEAR_MAX_VERTICES + 1 }, (_, i) => [
          i * 0.0001,
          0,
        ]),
      },
    };
    expect(
      assertMeasuringGeometryBudget({
        measuringSubject: "coastline",
        measuringLocationCategory: null,
        usesAllPlacesInArea: false,
        placeCount: 0,
        linearSegments: [fatSegment],
      }).ok,
    ).toBe(false);
  });
});

describe("measuring output complexity budget", () => {
  it("locks caps between museum-scale OK and RLBT golf-closer fatal sizes", () => {
    // museum ~1.3k / ~50 KB OK; golf ~8k / ~320 KB fatal
    expect(MEASURING_OUTPUT_MAX_VERTICES).toBeGreaterThan(1_300);
    expect(MEASURING_OUTPUT_MAX_VERTICES).toBeLessThan(8_000);
    expect(MEASURING_OUTPUT_MAX_JSON_CHARS).toBeGreaterThan(50_000);
    expect(MEASURING_OUTPUT_MAX_JSON_CHARS).toBeLessThan(320_000);
  });

  it("counts polygon vertices without spreading", () => {
    const square: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };
    expect(countPolygonVertices(square)).toBe(5);
  });

  it("passes museum-scale fixtures (~1.3k verts)", () => {
    const museum = denseZigzagPolygon(1_300);
    expect(countPolygonVertices(museum)).toBeGreaterThanOrEqual(1_200);
    expect(countPolygonVertices(museum)).toBeLessThan(
      MEASURING_OUTPUT_MAX_VERTICES,
    );
    expect(assertMeasuringOutputComplexityBudget(museum).ok).toBe(true);
    expect(softenMeasuringOutputToBudget(museum).ok).toBe(true);
  });

  it("softens dense geometry under the cap (simplify or decimate)", () => {
    const dense = denseZigzagPolygon(6_000);
    expect(countPolygonVertices(dense)).toBeGreaterThan(
      MEASURING_OUTPUT_MAX_VERTICES,
    );
    const softened = softenMeasuringOutputToBudget(dense);
    expect(softened.ok).toBe(true);
    if (softened.ok) {
      expect(assertMeasuringOutputComplexityBudget(softened.feature).ok).toBe(
        true,
      );
    }
  });

  it("refuses RLBT-class golf closer fixtures that stay over after soften", () => {
    // 1600 squares × 5 verts = 8000 — mirrors golf closer scale; squares resist soften.
    const golf = separateSquaresMultiPolygon(1_600);
    expect(countPolygonVertices(golf)).toBe(8_000);
    expect(measuringGeometryJsonChars(golf)).toBeGreaterThan(50_000);

    const asserted = assertMeasuringOutputComplexityBudget(golf);
    expect(asserted.ok).toBe(false);
    if (!asserted.ok) {
      expect(asserted.message).toBe(MEASURING_OUTPUT_OVER_BUDGET_MESSAGE);
    }

    const softened = softenMeasuringOutputToBudget(golf);
    expect(softened.ok).toBe(false);
    if (!softened.ok) {
      expect(softened.message).toBe(MEASURING_OUTPUT_OVER_BUDGET_MESSAGE);
    }
  });

  it("asserts by vertexCount / jsonChars without a Feature", () => {
    expect(
      assertMeasuringOutputComplexityBudget({
        vertexCount: MEASURING_OUTPUT_MAX_VERTICES,
      }).ok,
    ).toBe(true);
    expect(
      assertMeasuringOutputComplexityBudget({
        vertexCount: MEASURING_OUTPUT_MAX_VERTICES + 1,
      }).ok,
    ).toBe(false);
    expect(
      assertMeasuringOutputComplexityBudget({
        jsonChars: MEASURING_OUTPUT_MAX_JSON_CHARS + 1,
      }).ok,
    ).toBe(false);
  });
});
