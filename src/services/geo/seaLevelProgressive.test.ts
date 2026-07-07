import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";
import { clearGeographicFeatureCacheForTests } from "./geographicFeatureCache";
import {
  clearSeaLevelProgressiveStateForTests,
  ensureSeaLevelSamplingComplete,
  getSeaLevelSamplingProgress,
  startSeaLevelBackgroundSampling,
} from "./seaLevelProgressive";

vi.mock("./elevation", () => ({
  fetchElevations: vi.fn(async (points: Array<[number, number]>) =>
    points.map((_, index) => 10 + index),
  ),
}));

describe("seaLevelProgressive", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearSeaLevelProgressiveStateForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearSeaLevelProgressiveStateForTests();
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
    const { fetchElevations } = await import("./elevation");
    const fetchMock = vi.mocked(fetchElevations);

    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);
    startSeaLevelBackgroundSampling(DUBLIN_CITY_GAME_AREA);

    await ensureSeaLevelSamplingComplete(DUBLIN_CITY_GAME_AREA);

    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });
});
