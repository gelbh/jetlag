import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import {
  MEASURING_OUTPUT_MAX_JSON_CHARS,
  MEASURING_OUTPUT_MAX_VERTICES,
  MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
  persistSlimMeasuringGeometry,
} from "./measuringGeometryBudgets";

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

function separateSquaresMultiPolygon(squareCount: number): Feature<MultiPolygon> {
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
  it("locks persist caps to progressive polygon limits", () => {
    expect(MEASURING_OUTPUT_MAX_VERTICES).toBeGreaterThan(1_300);
    expect(MEASURING_OUTPUT_MAX_VERTICES).toBeLessThan(8_000);
    expect(MEASURING_OUTPUT_MAX_JSON_CHARS).toBeGreaterThan(50_000);
    expect(MEASURING_OUTPUT_MAX_JSON_CHARS).toBeLessThan(320_000);
  });

  it("persist-slim succeeds under the ceiling for soften-able density", () => {
    const dense = denseZigzagPolygon(6_000);
    const slimmed = persistSlimMeasuringGeometry(dense);
    expect(slimmed.ok).toBe(true);
  });

  it("persist-slim fails RLBT-class fixtures with storage copy only", () => {
    const golf = separateSquaresMultiPolygon(1_600);
    const slimmed = persistSlimMeasuringGeometry(golf);
    expect(slimmed.ok).toBe(false);
    if (!slimmed.ok) {
      expect(slimmed.message).toBe(MEASURING_PERSIST_OVER_BUDGET_MESSAGE);
    }
  });
});
