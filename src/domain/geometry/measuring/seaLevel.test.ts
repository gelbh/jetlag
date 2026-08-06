import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea } from "../../map/annotations";
import {
  buildSeaLevelEliminationRegion,
  buildSeaLevelNearRegionFromSamples,
  buildSeaLevelNearRegionWithLocalRefine,
  distanceFromSeaLevelMeters,
  resolveGameAreaCellDivisions,
  sampleGameAreaCells,
  subdivideElevationSampleCell,
  type ElevationSampleCell,
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

  it("local refine restores a truthful hider that coarse center misclassifies", () => {
    const divisions = 2;
    const cells = sampleGameAreaCells(sampleGameArea, divisions);
    expect(cells.length).toBeGreaterThan(0);

    // Coarse centers all "far" (> seeker 100m) — near region empty / lowest.
    const coarseElevations = cells.map(() => 180);
    const coarse = buildSeaLevelNearRegionFromSamples(
      cells,
      coarseElevations,
      100,
      sampleGameArea,
      divisions,
    );
    expect(coarse.region).toBeNull();

    // Pick a border cell and refine: three subcells near sea level, one far.
    const borderCell = cells[0]!;
    const refineCells = subdivideElevationSampleCell(borderCell, 2);
    const refineElevations = [40, 40, 40, 180];
    const hiderPoint: [number, number] = [
      refineCells[0]!.point[0],
      refineCells[0]!.point[1],
    ];

    const refined = buildSeaLevelNearRegionWithLocalRefine({
      cells,
      elevations: coarseElevations,
      seekerDistanceFromSeaLevelMeters: 100,
      gameArea: sampleGameArea,
      divisions,
      refineCells,
      refineElevations,
    });
    expect(refined.region).not.toBeNull();

    const elimination = buildSeaLevelEliminationRegion(
      refined.region!,
      sampleGameArea,
      "closer",
    );
    expect(elimination).not.toBeNull();

    const hiderPt = turfPoint([hiderPoint[1], hiderPoint[0]]);
    // closer → shade complement of near; truthful near hider stays unshaded
    expect(booleanPointInPolygon(hiderPt, elimination!)).toBe(false);
  });

  it("subdivideElevationSampleCell returns a 2×2 grid", () => {
    const cell: ElevationSampleCell = {
      point: [51.45, -0.15],
      south: 51.4,
      west: -0.2,
      north: 51.5,
      east: -0.1,
      row: 0,
      col: 0,
    };
    const children = subdivideElevationSampleCell(cell, 2);
    expect(children).toHaveLength(4);
    expect(children[0]?.south).toBe(51.4);
    expect(children[3]?.north).toBe(51.5);
  });
});
