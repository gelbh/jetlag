import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { clearGeographicFeatureCacheForTests } from "../cache";
import {
  clearSeaLevelProgressiveStateForTests,
  ensureSeaLevelSamplingComplete,
  getSeaLevelSamplingProgress,
  startSeaLevelBackgroundSampling,
} from "./seaLevelProgressive";
import { clearBundledSeaLevelSeedCacheForTests } from "./regionPackSeaLevelSeed";

vi.mock("./index", () => ({
  fetchElevations: vi.fn(async (points: Array<[number, number]>) =>
    points.map((_, index) => 10 + index),
  ),
}));

describe("seaLevelProgressive", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearSeaLevelProgressiveStateForTests();
    clearBundledSeaLevelSeedCacheForTests();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearSeaLevelProgressiveStateForTests();
    clearBundledSeaLevelSeedCacheForTests();
    vi.unstubAllGlobals();
  });

  it("reports idle progress before sampling starts", () => {
    const progress = getSeaLevelSamplingProgress(DUBLIN_CITY_GAME_AREA);
    expect(progress.phase).toBe("idle");
    expect(progress.completedCells).toBe(0);
    expect(progress.targetCells).toBeGreaterThan(0);
  });

  it("completes foreground sampling for measuring questions", async () => {
    const sampling = await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA);

    expect(sampling.complete).toBe(true);
    expect(sampling.cells.length).toBeGreaterThan(0);
    expect(sampling.cellElevations.every((value) => Number.isFinite(value))).toBe(
      true,
    );

    const progress = getSeaLevelSamplingProgress(DUBLIN_CITY_GAME_AREA);
    expect(progress.phase).toBe("complete");
    expect(progress.completedCells).toBe(progress.targetCells);
  });

  it("starts background sampling only once per game area", async () => {
    const { fetchElevations } = await import("./index");
    const fetchMock = vi.mocked(fetchElevations);

    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);
    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);

    await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA);

    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });

  it("hydrates remapped pack seed without awaiting elevation when onEnrich is set", async () => {
    const { fetchElevations } = await import("./index");
    const fetchMock = vi.mocked(fetchElevations);
    fetchMock.mockClear();
    // Never settle — proves ensure does not await progressive elevation.
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const bbox = {
      south: 53.24,
      west: -6.45,
      north: 53.43,
      east: -6.07,
    };
    const divisions = 8;
    const latStep = (bbox.north - bbox.south) / divisions;
    const lngStep = (bbox.east - bbox.west) / divisions;
    const cells: Array<{
      point: [number, number];
      south: number;
      west: number;
      north: number;
      east: number;
      row: number;
      col: number;
    }> = [];
    const cellElevations: number[] = [];
    for (let row = 0; row < divisions; row += 1) {
      for (let col = 0; col < divisions; col += 1) {
        const south = bbox.south + row * latStep;
        const north = bbox.south + (row + 1) * latStep;
        const west = bbox.west + col * lngStep;
        const east = bbox.west + (col + 1) * lngStep;
        cells.push({
          point: [(south + north) / 2, (west + east) / 2],
          south,
          west,
          north,
          east,
          row,
          col,
        });
        cellElevations.push(12 + row + col);
      }
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "open-meteo",
          divisions,
          bbox,
          cells,
          cellElevations,
          complete: false,
        }),
      })),
    );

    const enrich = vi.fn();
    const sampling = await ensureSeaLevelSamplingComplete(
      DUBLIN_CITY_GAME_AREA,
      {
        regionPackId: "dublin",
        onEnrich: enrich,
      },
    );

    expect(sampling.cells.length).toBeGreaterThan(1);
    expect(sampling.divisions).toBe(8);
    expect(
      sampling.cellElevations.every((value) => Number.isFinite(value)),
    ).toBe(true);
    // Session-local cells (not pack-native extents).
    expect(sampling.cells[0]?.south).toBeGreaterThanOrEqual(53.27 - 1e-9);
  });

  it("returns complete dense pack seed without awaiting elevation fetch", async () => {
    const { fetchElevations } = await import("./index");
    const fetchMock = vi.mocked(fetchElevations);
    fetchMock.mockClear();
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const bbox = {
      south: 53.24,
      west: -6.45,
      north: 53.43,
      east: -6.07,
    };
    const divisions = 20;
    const latStep = (bbox.north - bbox.south) / divisions;
    const lngStep = (bbox.east - bbox.west) / divisions;
    const cells: Array<{
      point: [number, number];
      south: number;
      west: number;
      north: number;
      east: number;
      row: number;
      col: number;
    }> = [];
    const cellElevations: number[] = [];
    for (let row = 0; row < divisions; row += 1) {
      for (let col = 0; col < divisions; col += 1) {
        const south = bbox.south + row * latStep;
        const north = bbox.south + (row + 1) * latStep;
        const west = bbox.west + col * lngStep;
        const east = bbox.west + (col + 1) * lngStep;
        cells.push({
          point: [(south + north) / 2, (west + east) / 2],
          south,
          west,
          north,
          east,
          row,
          col,
        });
        cellElevations.push(14);
      }
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "open-meteo",
          divisions,
          bbox,
          cells,
          cellElevations,
          complete: true,
        }),
      })),
    );

    const sampling = await ensureSeaLevelSamplingComplete(
      DUBLIN_CITY_GAME_AREA,
      { regionPackId: "dublin" },
    );

    expect(sampling.complete).toBe(true);
    expect(sampling.divisions).toBe(20);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
