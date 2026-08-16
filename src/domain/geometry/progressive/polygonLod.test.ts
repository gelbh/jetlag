import { describe, expect, it } from "vitest";
import type { Feature, Polygon } from "geojson";
import { countPolygonVertices } from "../measuring/measuringGeometryBudgets";
import {
  POLYGON_LOD_TURF_VERTEX_CEILING,
  buildCoarsePolygonFeature,
  refinePolygonFeatureStep,
} from "./polygonLod";

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

describe("polygonLod", () => {
  it("builds coarse with fewer vertices than a dense full feature", () => {
    const full = denseZigzagPolygon(6_000);
    const coarse = buildCoarsePolygonFeature(full);
    expect(countPolygonVertices(coarse)).toBeLessThan(
      countPolygonVertices(full),
    );
  });

  it("refines until done returns the full feature", () => {
    const full = denseZigzagPolygon(3_000);
    let current = buildCoarsePolygonFeature(full);
    let done = false;
    let step = 0;
    while (!done && step < 8) {
      const next = refinePolygonFeatureStep(full, current, step);
      current = next.feature;
      done = next.done;
      step += 1;
    }
    expect(done).toBe(true);
    expect(countPolygonVertices(current)).toBe(countPolygonVertices(full));
  });

  it("skips Turf path for dense rings over the LOD ceiling (stride coarse)", () => {
    const full = denseZigzagPolygon(6_000);
    expect(countPolygonVertices(full)).toBeGreaterThan(
      POLYGON_LOD_TURF_VERTEX_CEILING,
    );
    const coarse = buildCoarsePolygonFeature(full);
    const fullVerts = countPolygonVertices(full);
    expect(countPolygonVertices(coarse)).toBeLessThanOrEqual(
      Math.floor(fullVerts * 0.3),
    );
    const step = refinePolygonFeatureStep(full, coarse, 0);
    expect(countPolygonVertices(step.feature)).toBeGreaterThan(
      countPolygonVertices(coarse),
    );
  });
});
