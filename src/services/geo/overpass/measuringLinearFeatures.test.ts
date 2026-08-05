import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import * as overpassClient from "../../core/overpass/overpassClient";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { clearRegionPackGeoCacheForTests } from "../matching/regionPackBoundaries";
import { fetchPreparedMeasuringLinearSegments } from "./measuringLinearFeatures";

const ROOT = resolve(import.meta.dirname, "../../../..");

const dublinGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.45, 53.27],
      [-6.08, 53.27],
      [-6.08, 53.42],
      [-6.45, 53.42],
      [-6.45, 53.27],
    ],
  ],
};

const bundledLeaGeoJson = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Ballyfermot-Drimnagh" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-6.35, 53.33],
            [-6.3, 53.33],
            [-6.3, 53.35],
            [-6.35, 53.35],
            [-6.35, 53.33],
          ],
        ],
      },
    },
  ],
});

function stubFetchForDublinPackAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/dublin", relativePath), "utf8");
  const paths: Record<string, string> = {
    "/geo/dublin/councils.geojson": read("councils.geojson"),
    "/geo/dublin/leas.geojson": read("leas.geojson"),
  };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

describe("measuringLinearFeatures — bundled region pack fallthrough", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearRegionPackGeoCacheForTests();
  });

  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearRegionPackGeoCacheForTests();
    vi.restoreAllMocks();
  });

  it("never Overpass-falls-through for admin2_border when the region pack has bundled boundaries (no level-6 custom data)", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({ elements: [] });

    const prepared = await fetchPreparedMeasuringLinearSegments(
      dublinGameArea,
      "admin2_border",
      { 8: "{}", 9: "{}" },
      "dublin",
    );

    expect(queryOverpass).not.toHaveBeenCalled();
    expect(prepared.segments).toEqual([]);
  });

  it("uses bundled LEA custom boundaries for admin4_border and never calls Overpass", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({ elements: [] });

    const prepared = await fetchPreparedMeasuringLinearSegments(
      dublinGameArea,
      "admin4_border",
      { 9: bundledLeaGeoJson },
      "dublin",
    );

    expect(queryOverpass).not.toHaveBeenCalled();
    expect(prepared.segments.length).toBeGreaterThan(0);
  });

  it("derives admin4_border from region-pack boundaries when customMatchingAreas omit the level", async () => {
    stubFetchForDublinPackAssets();
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({ elements: [] });

    const prepared = await fetchPreparedMeasuringLinearSegments(
      dublinGameArea,
      "admin4_border",
      undefined,
      "dublin",
    );

    expect(queryOverpass).not.toHaveBeenCalled();
    expect(prepared.segments.length).toBeGreaterThan(0);
  });
});
