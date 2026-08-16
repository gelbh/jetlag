import { describe, expect, it } from "vitest";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  MEASURING_OUTPUT_MAX_VERTICES,
  MEASURING_OUTPUT_OVER_BUDGET_MESSAGE,
  MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
  countPolygonVertices,
  persistSlimMeasuringGeometry,
} from "./measuringGeometryBudgets";
import {
  buildMeasuringCoarseFeature,
  refineMeasuringFeatureStep,
} from "./measuringLod";

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

describe("measuringLod", () => {
  it("builds coarse with fewer vertices than a dense full feature", () => {
    const full = denseZigzagPolygon(6_000);
    const coarse = buildMeasuringCoarseFeature(full);
    expect(countPolygonVertices(coarse)).toBeLessThan(
      countPolygonVertices(full),
    );
  });

  it("refines until done returns the full feature", () => {
    const full = denseZigzagPolygon(3_000);
    let current = buildMeasuringCoarseFeature(full);
    let done = false;
    let step = 0;
    while (!done && step < 8) {
      const next = refineMeasuringFeatureStep(full, current, step);
      current = next.feature;
      done = next.done;
      step += 1;
    }
    expect(done).toBe(true);
    expect(countPolygonVertices(current)).toBe(countPolygonVertices(full));
  });

  it("persist-slim succeeds under the ceiling for soften-able density", () => {
    const dense = denseZigzagPolygon(6_000);
    expect(countPolygonVertices(dense)).toBeGreaterThan(
      MEASURING_OUTPUT_MAX_VERTICES,
    );
    const slimmed = persistSlimMeasuringGeometry(dense);
    expect(slimmed.ok).toBe(true);
  });

  it("persist-slim fail uses storage copy, not play-area complexity copy", () => {
    const golf = separateSquaresMultiPolygon(1_600);
    const slimmed = persistSlimMeasuringGeometry(golf);
    expect(slimmed.ok).toBe(false);
    if (!slimmed.ok) {
      expect(slimmed.message).toBe(MEASURING_PERSIST_OVER_BUDGET_MESSAGE);
      expect(slimmed.message).not.toBe(MEASURING_OUTPUT_OVER_BUDGET_MESSAGE);
    }
  });
});
