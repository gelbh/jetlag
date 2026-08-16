import { describe, expect, it } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/geometry";
import {
  remapBundledSeaLevelSeedToGameArea,
  type BundledSeaLevelSeed,
} from "./regionPackSeaLevelSeed";

function buildUniformSeed(
  bbox: { south: number; west: number; north: number; east: number },
  divisions: number,
  elevation: number,
): BundledSeaLevelSeed {
  const latStep = (bbox.north - bbox.south) / divisions;
  const lngStep = (bbox.east - bbox.west) / divisions;
  const cells = [];
  const cellElevations = [];
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      const south = bbox.south + row * latStep;
      const north = bbox.south + (row + 1) * latStep;
      const west = bbox.west + col * lngStep;
      const east = bbox.west + (col + 1) * lngStep;
      cells.push({
        point: [(south + north) / 2, (west + east) / 2] as [number, number],
        south,
        west,
        north,
        east,
        row,
        col,
      });
      cellElevations.push(elevation);
    }
  }
  return {
    source: "open-meteo",
    bbox,
    divisions,
    cells,
    cellElevations,
    complete: false,
  };
}

describe("remapBundledSeaLevelSeedToGameArea", () => {
  it("returns session-grid cells, not pack-native row/col extents", () => {
    const packBbox = {
      south: 53.24,
      west: -6.45,
      north: 53.43,
      east: -6.07,
    };
    const seed = buildUniformSeed(packBbox, 8, 18);
    const sampling = remapBundledSeaLevelSeedToGameArea(
      seed,
      DUBLIN_CITY_GAME_AREA,
    );

    expect(sampling).not.toBeNull();
    expect(sampling!.divisions).toBe(8);
    expect(sampling!.cells.length).toBeGreaterThan(0);

    const sessionBbox = gameAreaToBoundingBox(DUBLIN_CITY_GAME_AREA);
    for (const cell of sampling!.cells) {
      expect(cell.south).toBeGreaterThanOrEqual(sessionBbox.south - 1e-9);
      expect(cell.north).toBeLessThanOrEqual(sessionBbox.north + 1e-9);
      expect(cell.west).toBeGreaterThanOrEqual(sessionBbox.west - 1e-9);
      expect(cell.east).toBeLessThanOrEqual(sessionBbox.east + 1e-9);
    }
    expect(
      sampling!.cellElevations.every((value) => value === 18),
    ).toBe(true);
    expect(sampling!.complete).toBe(false);
  });

  it("marks complete when seed is dense enough for the session fine target", () => {
    const packBbox = {
      south: 53.24,
      west: -6.45,
      north: 53.43,
      east: -6.07,
    };
    const seed = buildUniformSeed(packBbox, 20, 22);
    seed.complete = true;

    const sampling = remapBundledSeaLevelSeedToGameArea(
      seed,
      DUBLIN_CITY_GAME_AREA,
    );

    expect(sampling).not.toBeNull();
    expect(sampling!.divisions).toBe(20);
    expect(sampling!.complete).toBe(true);
    expect(
      sampling!.cellElevations.every((value) => Number.isFinite(value)),
    ).toBe(true);
  });

  it("rejects sparse seeds that cannot cover the session grid", () => {
    const seed: BundledSeaLevelSeed = {
      source: "open-meteo",
      divisions: 8,
      cells: [
        {
          point: [53.35, -6.26],
          south: 53.34,
          west: -6.27,
          north: 53.36,
          east: -6.25,
          row: 0,
          col: 0,
        },
      ],
      cellElevations: [12],
      complete: false,
    };

    expect(
      remapBundledSeaLevelSeedToGameArea(seed, DUBLIN_CITY_GAME_AREA),
    ).toBeNull();
  });
});
