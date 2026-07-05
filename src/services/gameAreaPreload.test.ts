import { beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";
import { selectPreloadBanner, usePreloadStore } from "../state/preloadStore";
import {
  gameAreaPreloadKey,
  preloadCriticalGameAreaCaches,
  preloadGameAreaCaches,
} from "./gameAreaPreload";

vi.mock("./adminDivisionBoundaries", () => ({
  fetchAdminDivisionFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("./coastline", () => ({
  fetchPreparedCoastlineSegments: vi.fn(async () => []),
}));

vi.mock("./landmassFeatures", () => ({
  fetchLandmassFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("./measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(async () => []),
}));

vi.mock("./measuringLinearFeatures", () => ({
  fetchPreparedMeasuringLinearSegments: vi.fn(async () => []),
}));

vi.mock("./seaLevel", () => ({
  prefetchSeaLevelSampling: vi.fn(),
}));

vi.mock("./transitStatic", () => ({
  fetchStaticTransit: vi.fn(async () => ({
    stops: [],
    routes: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

describe("gameAreaPreload", () => {
  beforeEach(() => {
    usePreloadStore.setState({
      activeGameAreaKey: null,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      dismissed: false,
    });
  });

  it("builds a stable preload key from game area coordinates", () => {
    expect(gameAreaPreloadKey(DUBLIN_CITY_GAME_AREA)).toBe(
      JSON.stringify(DUBLIN_CITY_GAME_AREA.coordinates),
    );
  });

  it("tracks background preload progress in the preload store", async () => {
    const key = gameAreaPreloadKey(DUBLIN_CITY_GAME_AREA);

    preloadGameAreaCaches(DUBLIN_CITY_GAME_AREA);

    expect(usePreloadStore.getState().activeGameAreaKey).toBe(key);
    expect(usePreloadStore.getState().totalJobs).toBeGreaterThan(0);

    await vi.waitFor(() => {
      expect(selectPreloadBanner(usePreloadStore.getState()).loading).toBe(false);
    });
  });

  it("warms critical caches without throwing", async () => {
    await expect(
      preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA),
    ).resolves.toBeUndefined();
  });
});
