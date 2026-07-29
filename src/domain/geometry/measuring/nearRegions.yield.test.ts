import { afterEach, describe, expect, it, vi } from "vitest";
import type { Feature, LineString } from "geojson";
import type { GameArea } from "../../map/annotations";
import {
  buildCoastlineNearRegion,
  clearCoastlineNearRegionCacheForTests,
  COASTLINE_NEAR_REGION_YIELD_EVERY,
  setCoastlineNearRegionYieldHookForTests,
} from "./nearRegions";

vi.mock("./geodesicLineBuffer", () => ({
  dispatchGeodesicLineBuffer: vi.fn(async () => ({
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-0.15, 51.45],
          [-0.14, 51.45],
          [-0.14, 51.46],
          [-0.15, 51.46],
          [-0.15, 51.45],
        ],
      ],
    },
  })),
}));

vi.mock("../kernel/resolveClientMaskKernelMode", () => ({
  resolveClientMaskKernelMode: () => "ts" as const,
}));

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.3, 51.3],
      [0.1, 51.3],
      [0.1, 51.6],
      [-0.3, 51.6],
      [-0.3, 51.3],
    ],
  ],
};

function lineSegment(index: number): Feature<LineString> {
  const offset = index * 0.01;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-0.2 + offset, 51.45],
        [-0.19 + offset, 51.45],
      ],
    },
  };
}

describe("buildCoastlineNearRegion cooperative yield", () => {
  afterEach(() => {
    clearCoastlineNearRegionCacheForTests();
    setCoastlineNearRegionYieldHookForTests(null);
  });

  it("yields to the event loop when segment count exceeds the interval", async () => {
    let yieldCount = 0;
    setCoastlineNearRegionYieldHookForTests(async () => {
      yieldCount += 1;
    });

    const segments = Array.from(
      { length: COASTLINE_NEAR_REGION_YIELD_EVERY + 1 },
      (_, index) => lineSegment(index),
    );

    await buildCoastlineNearRegion(segments, 5_000, sampleGameArea);

    expect(yieldCount).toBeGreaterThanOrEqual(1);
  });
});
