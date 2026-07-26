import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../../domain/map/annotations";
import * as overpassClient from "../../core/overpassClient";
import { clearGeographicFeatureCacheForTests } from "../geographicFeatureCache";
import { fetchPreparedMeasuringLinearSegments } from "./measuringLinearFeatures";

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

describe("measuringLinearFeatures — bundled region pack fallthrough", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
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
});
