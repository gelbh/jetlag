import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveFineSeaLevelDivisions,
  sampleGameAreaCells,
} from "@/domain/geometry/measuring/seaLevel";
import { createProgressRoot } from "@/domain/progress/progressTree";
import { DUBLIN_CITY_GAME_AREA } from "@/test/fixtures/dublinGameArea";
import { clearGeographicFeatureCacheForTests, writeSeaLevelSamplingCache } from "../cache";
import { clearBundledSeaLevelSeedCacheForTests } from "./regionPackSeaLevelSeed";
import {
  clearSeaLevelProgressiveStateForTests,
  ensureSeaLevelSamplingComplete,
  followSeaLevelCrawl,
  getSeaLevelSamplingProgress,
  startSeaLevelBackgroundSampling,
} from "./seaLevelProgressive";

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
    expect(sampling.cellElevations.every((value) => Number.isFinite(value))).toBe(true);

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

  it("resumes background crawl when cached complete lacks finite elevations", async () => {
    const { fetchElevations } = await import("./index");
    const fetchMock = vi.mocked(fetchElevations);
    fetchMock.mockClear();

    const divisions = resolveFineSeaLevelDivisions(DUBLIN_CITY_GAME_AREA);
    const cells = sampleGameAreaCells(DUBLIN_CITY_GAME_AREA, divisions);
    await writeSeaLevelSamplingCache(DUBLIN_CITY_GAME_AREA, {
      cells,
      cellElevations: cells.map(() => Number.NaN),
      divisions,
      complete: true,
    });

    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });
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
    const sampling = await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA, {
      regionPackId: "dublin",
      onEnrich: enrich,
    });

    expect(sampling.cells.length).toBeGreaterThan(1);
    expect(sampling.divisions).toBe(8);
    expect(sampling.cellElevations.every((value) => Number.isFinite(value))).toBe(true);
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

    const sampling = await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA, {
      regionPackId: "dublin",
    });

    expect(sampling.complete).toBe(true);
    expect(sampling.divisions).toBe(20);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("background start with dense pack seed skips elevation fetch", async () => {
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

    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA, {
      regionPackId: "dublin",
    });

    await vi.waitFor(() => {
      expect(getSeaLevelSamplingProgress(DUBLIN_CITY_GAME_AREA).phase).toBe("complete");
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("seaLevelProgressive foreground follow", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearSeaLevelProgressiveStateForTests();
    clearBundledSeaLevelSeedCacheForTests();
    const { fetchElevations } = await import("./index");
    vi.mocked(fetchElevations).mockImplementation(async (points) =>
      points.map((_, index) => 10 + index),
    );
  });

  afterEach(() => {
    clearSeaLevelProgressiveStateForTests();
  });

  it("reports the running crawl's cell count and skips its background gaps", async () => {
    const root = createProgressRoot("Task", { now: () => Date.now(), expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "Sampling", historyKey: "x" });
    const setCount = vi.spyOn(node, "setCount");

    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);
    const startedAt = Date.now();
    await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA, { node });
    const elapsed = Date.now() - startedAt;

    expect(setCount.mock.calls.length).toBeGreaterThan(1);
    const [done, total] = setCount.mock.calls.at(-1) ?? [];
    expect(done).toBe(total);
    // Unpromoted, the crawl sleeps 400 ms between batches and 800 ms between phases.
    expect(elapsed).toBeLessThan(1_500);
  });

  it("tolerates a double detach", () => {
    const detach = followSeaLevelCrawl(DUBLIN_CITY_GAME_AREA);
    detach();
    expect(() => detach()).not.toThrow();
  });

  it("rejects the foreground wait on cancel without stopping the crawl", async () => {
    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);
    const controller = new AbortController();
    const wait = ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA, {
      signal: controller.signal,
    });
    controller.abort(new DOMException("Cancelled.", "AbortError"));
    await expect(wait).rejects.toMatchObject({ name: "AbortError" });
    await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA);
    expect(getSeaLevelSamplingProgress(DUBLIN_CITY_GAME_AREA).phase).toBe("complete");
  });
});
