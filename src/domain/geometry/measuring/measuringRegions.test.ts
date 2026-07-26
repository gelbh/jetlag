import { describe, expect, it } from "vitest";
import type { GameArea } from "../../map/annotations";
import { buildMeasuringRegions } from "./measuringRegions";

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("buildMeasuringRegions", () => {
  it("returns near and elimination regions for a location answer", async () => {
    const regions = await buildMeasuringRegions({
      gameArea,
      measuringSubject: "location",
      measuringLocationCategory: "museum",
      measuringDistanceMeters: 1000,
      measuringAnswer: "closer",
      measuringTargetPoint: [51.45, -0.15],
      measuringPlaces: [],
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      usesAllPlacesInArea: false,
    });

    expect(regions).not.toBeNull();
    expect(regions?.near.geometry.type).toMatch(/Polygon|MultiPolygon/);
    expect(regions?.elimination.geometry.type).toMatch(/Polygon|MultiPolygon/);
  });

  it("returns null before an answer is chosen", async () => {
    const regions = await buildMeasuringRegions({
      gameArea,
      measuringSubject: "location",
      measuringLocationCategory: "museum",
      measuringDistanceMeters: 1000,
      measuringAnswer: null,
      measuringTargetPoint: [51.45, -0.15],
      measuringPlaces: [],
      measuringCoastSegments: [],
      measuringSeaLevelNearRegion: null,
      usesAllPlacesInArea: false,
    });

    expect(regions).toBeNull();
  });
});
