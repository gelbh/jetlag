import { beforeEach, describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";
import { OverpassUnavailableError } from "../core/overpassClient";
import * as adminDivisionAvailability from "../geo/overpass/adminDivisionAvailability";
import { fetchAdminDivisionFeaturesInArea } from "../geo/overpass/adminDivisionBoundaries";
import { fetchPreparedCoastlineSegments } from "../geo/overpass/coastline";
import { fetchLandmassFeaturesInArea } from "../geo/overpass/landmassFeatures";
import { fetchPreparedMeasuringLinearSegments } from "../geo/overpass/measuringLinearFeatures";
import {
  gameAreaPreloadKey,
  preloadCriticalGameAreaCaches,
  preloadGameAreaCachesAsync,
  preloadJobGapMsForTests,
  preloadJobGapPremiumMsForTests,
  preloadJobGapMsForTier,
} from "./gameAreaPreload";

// Mock implementation modules (not barrels) so importOriginal of availability
// and other overpass/matching importers see the stub.
vi.mock("../geo/overpass/adminDivisionBoundaries", () => ({
  fetchAdminDivisionFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/overpass/coastline", () => ({
  fetchPreparedCoastlineSegments: vi.fn(async () => []),
}));

vi.mock("../geo/overpass/landmassFeatures", () => ({
  fetchLandmassFeaturesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/overpass/measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(async () => []),
}));

vi.mock("../geo/overpass/measuringLinearFeatures", () => ({
  fetchPreparedMeasuringLinearSegments: vi.fn(async () => []),
}));

vi.mock("../transit/transitStatic", () => ({
  fetchStaticTransit: vi.fn(async () => ({
    stops: [],
    routes: [],
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
}));

vi.mock("../geo/overpass/adminDivisionAvailability", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../geo/overpass/adminDivisionAvailability")
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
    vi.clearAllMocks();
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

    const preloadPromise = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);

    expect(usePreloadStore.getState().activeGameAreaKey).toBe(key);
    const jobCount = usePreloadStore.getState().totalJobs;
    expect(jobCount).toBeGreaterThan(0);

    await vi.runAllTimersAsync();
    await preloadPromise;

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

    expect(fetchPreparedCoastlineSegments).not.toHaveBeenCalled();
    expect(fetchLandmassFeaturesInArea).not.toHaveBeenCalled();
  });

  it("never preloads landmass Overpass on background or critical paths", async () => {
    vi.useFakeTimers();

    const backgroundPromise = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await backgroundPromise;

    await preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA);

    expect(fetchLandmassFeaturesInArea).not.toHaveBeenCalled();
  });

  it("never preloads coastline or measuring linear segments on map enter", async () => {
    vi.useFakeTimers();

    const preloadPromise = preloadGameAreaCachesAsync(
      DUBLIN_CITY_GAME_AREA,
      { 8: "{}", 9: "{}" },
      "dublin",
    );

    await vi.runAllTimersAsync();
    await preloadPromise;

    await preloadCriticalGameAreaCaches(
      DUBLIN_CITY_GAME_AREA,
      { 8: "{}", 9: "{}" },
      "dublin",
    );

    expect(fetchPreparedCoastlineSegments).not.toHaveBeenCalled();
    expect(fetchPreparedMeasuringLinearSegments).not.toHaveBeenCalled();
  });

  it("never Overpass-preloads admin 4/6 or admin2_border for a bundled region pack (Dublin)", async () => {
    vi.useFakeTimers();

    const preloadPromise = preloadGameAreaCachesAsync(
      DUBLIN_CITY_GAME_AREA,
      { 8: "{}", 9: "{}" },
      "dublin",
    );

    await vi.runAllTimersAsync();
    await preloadPromise;

    const fetchedAdminLevels = vi
      .mocked(fetchAdminDivisionFeaturesInArea)
      .mock.calls.map(([, level]) => level);
    expect(fetchedAdminLevels).not.toContain(4);
    expect(fetchedAdminLevels).not.toContain(6);
    expect(fetchedAdminLevels).toEqual(expect.arrayContaining([8, 9]));

    const fetchedLinearKinds = vi
      .mocked(fetchPreparedMeasuringLinearSegments)
      .mock.calls.map(([, kind]) => kind);
    expect(fetchedLinearKinds).not.toContain("admin2_border");
    expect(fetchedLinearKinds).toHaveLength(0);
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
