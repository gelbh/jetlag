import { beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";
import { OverpassUnavailableError } from "../core/overpassClient";
import * as adminDivisionAvailability from "../geo/adminDivisionAvailability";
import { fetchPreparedCoastlineSegments } from "../geo/coastline";
import { fetchLandmassFeaturesInArea } from "../geo/landmassFeatures";
import {
  gameAreaPreloadKey,
  preloadCriticalGameAreaCaches,
  preloadGameAreaCaches,
  preloadJobGapMsForTests,
  preloadJobGapPremiumMsForTests,
  preloadJobGapMsForTier,
} from "./gameAreaPreload";

vi.mock("../geo/adminDivisionBoundaries", () => ({
  fetchAdminDivisionFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/coastline", () => ({
  fetchPreparedCoastlineSegments: vi.fn(async () => []),
}));

vi.mock("../geo/landmassFeatures", () => ({
  fetchLandmassFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/measuringLinearFeatures", () => ({
  fetchPreparedMeasuringLinearSegments: vi.fn(async () => []),
}));

vi.mock("../transit/transitStatic", () => ({
  fetchStaticTransit: vi.fn(async () => ({
    stops: [],
    routes: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("../geo/adminDivisionAvailability", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../geo/adminDivisionAvailability")
  >();
  return {
    ...actual,
    probeAdminDivisionCounts: vi.fn(actual.probeAdminDivisionCounts),
  };
});

describe("gameAreaPreload", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    vi.useFakeTimers();
    const key = gameAreaPreloadKey(DUBLIN_CITY_GAME_AREA);

    preloadGameAreaCaches(DUBLIN_CITY_GAME_AREA);

    expect(usePreloadStore.getState().activeGameAreaKey).toBe(key);
    const jobCount = usePreloadStore.getState().totalJobs;
    expect(jobCount).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(
      jobCount * preloadJobGapMsForTests() + 100,
    );

    expect(selectPreloadBanner(usePreloadStore.getState()).loading).toBe(false);
    expect(usePreloadStore.getState().completedJobs).toBe(jobCount);
  });

  it("warms critical caches without throwing", async () => {
    await expect(
      preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA),
    ).resolves.toBeUndefined();
  });

  it("continues critical preload when admin division probe fails", async () => {
    vi.spyOn(
      adminDivisionAvailability,
      "probeAdminDivisionCounts",
    ).mockRejectedValue(new OverpassUnavailableError());

    await expect(
      preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA),
    ).resolves.toBeUndefined();

    expect(fetchPreparedCoastlineSegments).toHaveBeenCalled();
    expect(fetchLandmassFeaturesInArea).toHaveBeenCalled();
  });

  it("uses a shorter preload gap for premium sessions", () => {
    expect(preloadJobGapMsForTier("premium")).toBe(
      preloadJobGapPremiumMsForTests(),
    );
    expect(preloadJobGapMsForTier("free")).toBe(preloadJobGapMsForTests());
    expect(preloadJobGapPremiumMsForTests()).toBeLessThan(
      preloadJobGapMsForTests(),
    );
  });
});
