import type { Feature, Polygon } from "geojson";
import { afterEach, describe, expect, it, vi } from "vitest";
import { countPolygonVertices } from "./polygonMetrics";
import { POLYGON_UNION_SLICE_BATCH, unionPolygonFeaturesInSlices } from "./unionSlices";

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

afterEach(() => {
  vi.doUnmock("../kernel/unionKernelRunner");
  vi.resetModules();
});

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

  it("awaits runUnionPolygonFeatures for multi-feature input", async () => {
    vi.resetModules();
    const runUnionPolygonFeatures = vi.fn(async (features: readonly Feature<Polygon>[]) => {
      return features[0] ?? null;
    });
    vi.doMock("../kernel/unionKernelRunner", () => ({
      runUnionPolygonFeatures,
    }));
    const { unionPolygonFeaturesInSlices: unionInSlices } = await import("./unionSlices");
    await unionInSlices([unitSquare(0), unitSquare(1)]);
    expect(runUnionPolygonFeatures).toHaveBeenCalled();
  });

  it("does not use Martinez when wasm union throws", async () => {
    vi.resetModules();
    vi.doMock("../kernel/unionKernelRunner", () => ({
      runUnionPolygonFeatures: vi.fn(async () => {
        throw new Error("wasm boom");
      }),
    }));
    const martinez = vi.spyOn(
      await import("../kernel/unionPolygonFeatures"),
      "unionPolygonFeatures",
    );
    const { unionPolygonFeaturesInSlices: unionInSlices } = await import("./unionSlices");
    await expect(unionInSlices([unitSquare(0), unitSquare(1)])).rejects.toThrow("wasm boom");
    expect(martinez).not.toHaveBeenCalled();
  });
});
