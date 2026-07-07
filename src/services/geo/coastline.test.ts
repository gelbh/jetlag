import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../domain/annotations";
import * as overpassClient from "./overpassClient";
import { clearGeographicFeatureCacheForTests } from "./geographicFeatureCache";
import { fetchCoastlineSegments } from "./coastline";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
};

describe("coastline lookup", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  it("parses coastline ways from Overpass", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "way",
          geometry: [
            { lat: 53.35, lon: -6.35 },
            { lat: 53.36, lon: -6.34 },
          ],
        },
      ],
    });

    const segments = await fetchCoastlineSegments(sampleGameArea);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.geometry.coordinates).toEqual([
      [-6.35, 53.35],
      [-6.34, 53.36],
    ]);
  });

  it("reuses cached coastline segments for the same play area", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({
        elements: [
          {
            type: "way",
            geometry: [
              { lat: 53.35, lon: -6.35 },
              { lat: 53.36, lon: -6.34 },
            ],
          },
        ],
      });

    await fetchCoastlineSegments(sampleGameArea);
    await fetchCoastlineSegments(sampleGameArea);

    expect(queryOverpass).toHaveBeenCalledTimes(1);
  });
});
