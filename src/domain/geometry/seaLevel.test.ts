import { describe, expect, it } from "vitest";
import type { GameArea } from "../map/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  resolveGameAreaCellDivisions,
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

const smallGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.101, 51.401],
      [-0.098, 51.401],
      [-0.098, 51.404],
      [-0.101, 51.404],
      [-0.101, 51.401],
    ],
  ],
};

const largeGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-1, 50],
      [1, 50],
      [1, 52],
      [-1, 52],
      [-1, 50],
    ],
  ],
};

describe("sea level measuring", () => {
  it("treats distance from sea level as absolute altitude", () => {
    expect(distanceFromSeaLevelMeters(120)).toBe(120);
    expect(distanceFromSeaLevelMeters(-35)).toBe(35);
  });

  it("uses finer grid divisions for small play areas", () => {
    expect(resolveGameAreaCellDivisions(smallGameArea)).toBeGreaterThan(10);
    expect(resolveGameAreaCellDivisions(largeGameArea)).toBeLessThanOrEqual(10);
  });

  it("builds a near-sea-level region from sampled elevations", () => {
    const cells = sampleGameAreaCells(sampleGameArea, 4);
    const elevations = cells.map((_, index) => (index % 2 === 0 ? 40 : 180));

    const { region: nearRegion, edgeCase } = buildSeaLevelNearRegionFromSamples(
      cells,
      elevations,
      100,
      sampleGameArea,
      4,
    );

    expect(edgeCase).toBeNull();
    expect(
      nearRegion?.geometry.type === "Polygon" ||
        nearRegion?.geometry.type === "MultiPolygon",
    ).toBe(true);
  });

  it("flags lowest elevation when no cells are closer to sea level", () => {
    const cells = sampleGameAreaCells(sampleGameArea, 4);
    const elevations = cells.map(() => 500);

    const { region, edgeCase } = buildSeaLevelNearRegionFromSamples(
      cells,
      elevations,
      100,
      sampleGameArea,
      4,
    );

    expect(region).toBeNull();
    expect(edgeCase).toBe("lowest");
  });

  it("flags highest elevation when every sampled cell is closer to sea level", () => {
    const cells = sampleGameAreaCells(sampleGameArea, 4);
    const elevations = cells.map(() => 40);

    const { region, edgeCase } = buildSeaLevelNearRegionFromSamples(
      cells,
      elevations,
      500,
      sampleGameArea,
      4,
    );

    expect(edgeCase).toBe("highest");
    expect(
      region?.geometry.type === "Polygon" ||
        region?.geometry.type === "MultiPolygon",
    ).toBe(true);
  });
});
