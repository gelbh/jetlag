import { describe, expect, it, vi } from "vitest";
import type { Feature, Polygon } from "geojson";
import { countPolygonVertices } from "./polygonMetrics";
import {
  POLYGON_UNION_SLICE_BATCH,
  unionPolygonFeaturesInSlices,
} from "./unionSlices";

function unitSquare(i: number): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [i, 0],
          [i + 1, 0],
          [i + 1, 1],
          [i, 1],
          [i, 0],
        ],
      ],
    },
  };
}

describe("unionPolygonFeaturesInSlices", () => {
  it("unions more than POLYGON_UNION_SLICE_BATCH features without dropping any", async () => {
    const squares = Array.from({ length: 12 }, (_, i) => unitSquare(i));
    const united = await unionPolygonFeaturesInSlices(squares, {
      batchSize: POLYGON_UNION_SLICE_BATCH,
      yieldFn: async () => {},
    });
    expect(united).not.toBeNull();
    expect(countPolygonVertices(united!)).toBeGreaterThan(4);
  });

  it("calls yieldFn between batches", async () => {
    const yieldFn = vi.fn(async () => {});
    await unionPolygonFeaturesInSlices(
      Array.from({ length: 9 }, (_, i) => unitSquare(i)),
      { batchSize: 8, yieldFn },
    );
    expect(yieldFn).toHaveBeenCalled();
  });
});
