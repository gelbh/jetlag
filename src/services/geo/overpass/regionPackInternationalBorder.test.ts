import type { Feature, LineString } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBundledInternationalBorderCacheForTests,
  loadBundledInternationalBorderPack,
} from "./regionPackInternationalBorder";

const packSegment: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [6.0, 46.5],
      [6.1, 46.6],
    ],
  },
};

describe("loadBundledInternationalBorderPack", () => {
  beforeEach(() => {
    clearBundledInternationalBorderCacheForTests();
  });

  afterEach(() => {
    clearBundledInternationalBorderCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses a fixture with one LineString", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "switzerland-cantons-union",
          bbox: { south: 45.8, west: 5.9, north: 47.8, east: 10.5 },
          segments: [packSegment],
        }),
      })),
    );

    const pack = await loadBundledInternationalBorderPack("switzerland");

    expect(pack).not.toBeNull();
    expect(pack?.source).toBe("switzerland-cantons-union");
    expect(pack?.segments).toHaveLength(1);
    expect(pack?.segments[0]?.geometry.coordinates).toEqual(packSegment.geometry.coordinates);
  });
});
