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

  it("hydrates from pack seed without awaiting elevation when onEnrich is set", async () => {
    const { fetchElevations } = await import("./index");
    const fetchMock = vi.mocked(fetchElevations);
    fetchMock.mockClear();
    // Never settle — proves ensure does not await progressive elevation.
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    const seedCells = [
      {
        point: [53.35, -6.26] as [number, number],
        south: 53.34,
        west: -6.27,
        north: 53.36,
        east: -6.25,
        row: 0,
        col: 0,
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "open-meteo",
          divisions: 8,
          cells: seedCells,
          cellElevations: [12],
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

    expect(sampling.cells).toHaveLength(1);
    expect(sampling.cellElevations[0]).toBe(12);
  });
});
