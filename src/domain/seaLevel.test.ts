import { describe, expect, it } from "vitest";
import type { GameArea } from "./annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  sampleGameAreaCells,
} from "./seaLevel";

const sampleGameArea: GameArea = {
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

describe("sea level measuring", () => {
  it("treats distance from sea level as absolute altitude", () => {
    expect(distanceFromSeaLevelMeters(120)).toBe(120);
    expect(distanceFromSeaLevelMeters(-35)).toBe(35);
  });

  it("builds a near-sea-level region from sampled elevations", () => {
    const cells = sampleGameAreaCells(sampleGameArea, 4);
    const elevations = cells.map((_, index) => (index % 2 === 0 ? 40 : 180));

    const nearRegion = buildSeaLevelNearRegionFromSamples(
      cells,
      elevations,
      100,
      sampleGameArea,
    );

    expect(
      nearRegion?.geometry.type === "Polygon" ||
        nearRegion?.geometry.type === "MultiPolygon",
    ).toBe(true);
  });
});
