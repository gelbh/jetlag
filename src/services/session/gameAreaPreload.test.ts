import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { trackLazy } from "../core/analytics/lazyTelemetry";
import { OverpassUnavailableError } from "../core/overpass/overpassClient";
import { getGlobalLoadTasks } from "../core/progress/loadTask";
import * as adminDivisionAvailability from "../geo/overpass/adminDivisionAvailability";
import { fetchAdminDivisionFeaturesInArea } from "../geo/overpass/adminDivisionBoundaries";
import { fetchPreparedCoastlineSegments } from "../geo/overpass/coastline";
import { fetchLandmassFeaturesInArea } from "../geo/overpass/landmassFeatures";
import { fetchPreparedMeasuringLinearSegments } from "../geo/overpass/measuringLinearFeatures";
import { fetchMeasuringPlacesInArea } from "../geo/overpass/measuringPlaces";
import * as playAreaCategoryPresenceProbe from "../geo/overpass/playAreaCategoryPresenceProbe";
import {
  abortActiveGameAreaPreload,
  gameAreaPreloadKey,
  preloadCriticalGameAreaCaches,
  preloadGameAreaCachesAsync,
  preloadJobGapMsForTests,
  preloadJobGapMsForTier,
  preloadJobGapPremiumMsForTests,
  preloadMeasuringCategoriesForTests,
} from "./gameAreaPreload";
import { teardownSessionUiState } from "./sessionCleanup";

vi.mock("../core/analytics/lazyTelemetry", () => ({
  trackLazy: vi.fn(),
}));

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
  const actual = await importOriginal<typeof import("../geo/overpass/adminDivisionAvailability")>();
  return {
    ...actual,
    probeAdminDivisionCounts: vi.fn(actual.probeAdminDivisionCounts),
  };
});

vi.mock("../geo/overpass/playAreaCategoryPresenceProbe", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../geo/overpass/playAreaCategoryPresenceProbe")>();
  return {
    ...actual,
    probePlayAreaCategoryCounts: vi.fn(actual.probePlayAreaCategoryCounts),
  };
});

describe("gameAreaPreload", () => {
  beforeEach(() => {
    abortActiveGameAreaPreload();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(playAreaCategoryPresenceProbe.probePlayAreaCategoryCounts).mockResolvedValue({});
    usePreloadStore.setState({
      activeGameAreaKey: null,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      critical: null,
      dismissed: false,
      adminDivisionCounts: null,
      categoryPresenceCounts: null,
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
    await expect(preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA)).resolves.toBeUndefined();
  });

  it("tracks critical preload in its own slice and as a global task", async () => {
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );
    const key = gameAreaPreloadKey(DUBLIN_CITY_GAME_AREA);

    const critical = preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA);
    const totalJobs = usePreloadStore.getState().critical?.totalJobs ?? 0;
    expect(totalJobs).toBeGreaterThan(1);
    expect(getGlobalLoadTasks().map((task) => task.label)).toContain("Caching area boundaries");

    // The map screen's main preload must not wipe the critical counts.
    usePreloadStore.getState().reset(key, 4);
    await critical;

    expect(usePreloadStore.getState().critical).toMatchObject({
      gameAreaKey: key,
      totalJobs,
      completedJobs: totalJobs,
      failedJobs: 0,
    });
    expect(selectPreloadBanner(usePreloadStore.getState())).toMatchObject({
      totalJobs: totalJobs + 4,
      completedJobs: totalJobs,
    });
    expect(getGlobalLoadTasks().map((task) => task.label)).not.toContain("Caching area boundaries");
  });

  it("drops the critical preload chip on session teardown", async () => {
    const pending = new Promise<never>(() => {});
    vi.mocked(fetchAdminDivisionFeaturesInArea).mockReturnValue(pending);
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );

    void preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA);
    await vi.waitFor(() => expect(fetchAdminDivisionFeaturesInArea).toHaveBeenCalled());
    const chip = getGlobalLoadTasks().find((task) => task.label === "Caching area boundaries");
    expect(chip).toBeDefined();

    teardownSessionUiState();

    expect(getGlobalLoadTasks()).not.toContain(chip);
    expect(chip?.signal.aborted).toBe(true);
    vi.mocked(fetchAdminDivisionFeaturesInArea).mockImplementation(async () => []);
  });

  it("continues critical preload when admin division probe fails", async () => {
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockRejectedValue(
      new OverpassUnavailableError(),
    );

    await expect(preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA)).resolves.toBeUndefined();

    expect(fetchPreparedCoastlineSegments).not.toHaveBeenCalled();
    expect(fetchLandmassFeaturesInArea).not.toHaveBeenCalled();
  });

  it("stores category presence counts after a successful probe on background preload", async () => {
    vi.useFakeTimers();
    vi.spyOn(playAreaCategoryPresenceProbe, "probePlayAreaCategoryCounts").mockResolvedValue({
      zoo: 0,
      museum: 4,
    });

    const key = gameAreaPreloadKey(DUBLIN_CITY_GAME_AREA);
    const preloadPromise = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await preloadPromise;

    expect(playAreaCategoryPresenceProbe.probePlayAreaCategoryCounts).toHaveBeenCalledTimes(1);
    expect(usePreloadStore.getState().categoryPresenceCounts).toEqual({ zoo: 0, museum: 4 });
    expect(usePreloadStore.getState().activeGameAreaKey).toBe(key);
  });

  it("leaves category presence unset when the probe soft-fails", async () => {
    vi.useFakeTimers();
    vi.spyOn(playAreaCategoryPresenceProbe, "probePlayAreaCategoryCounts").mockRejectedValue(
      new OverpassUnavailableError(),
    );

    const preloadPromise = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await preloadPromise;

    expect(usePreloadStore.getState().categoryPresenceCounts).toBeNull();
    expect(selectPreloadBanner(usePreloadStore.getState()).loading).toBe(false);
  });

  it("shares one category presence probe between critical and main preload", async () => {
    vi.useFakeTimers();
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );

    const main = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    const critical = preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await Promise.all([main, critical]);

    expect(playAreaCategoryPresenceProbe.probePlayAreaCategoryCounts).toHaveBeenCalledTimes(1);
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

    await preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA, { 8: "{}", 9: "{}" }, "dublin");

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

  it("preloads measuring categories with auto-attached region pack id", async () => {
    vi.useFakeTimers();

    const preloadPromise = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    await vi.runAllTimersAsync();
    await preloadPromise;

    const expectedCategories = preloadMeasuringCategoriesForTests();
    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(expectedCategories.length);
    for (const category of expectedCategories) {
      expect(fetchMeasuringPlacesInArea).toHaveBeenCalledWith(
        DUBLIN_CITY_GAME_AREA,
        category,
        [],
        "dublin",
        { priority: "background" },
      );
    }
  });

  it("preloads measuring categories with australia state subregionId", async () => {
    vi.useFakeTimers();

    const preloadPromise = preloadGameAreaCachesAsync(
      DUBLIN_CITY_GAME_AREA,
      undefined,
      "australia",
      "free",
      "nsw",
    );
    await vi.runAllTimersAsync();
    await preloadPromise;

    const expectedCategories = preloadMeasuringCategoriesForTests();
    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(expectedCategories.length);
    for (const category of expectedCategories) {
      expect(fetchMeasuringPlacesInArea).toHaveBeenCalledWith(
        DUBLIN_CITY_GAME_AREA,
        category,
        [],
        "australia",
        { priority: "background", subregionId: "nsw" },
      );
    }
  });

  it("uses a shorter preload gap for premium sessions", () => {
    expect(preloadJobGapMsForTier("premium")).toBe(preloadJobGapPremiumMsForTests());
    expect(preloadJobGapMsForTier("free")).toBe(preloadJobGapMsForTests());
    expect(preloadJobGapPremiumMsForTests()).toBeLessThan(preloadJobGapMsForTests());
  });

  it("runs the main preload once when called repeatedly for the same play area", async () => {
    vi.useFakeTimers();

    const first = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    const second = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    expect(second).toBe(first);

    await vi.runAllTimersAsync();
    await first;
    await preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");

    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(
      preloadMeasuringCategoriesForTests().length,
    );
    const state = usePreloadStore.getState();
    expect(state.completedJobs).toBe(state.totalJobs);
    expect(selectPreloadBanner(state).loading).toBe(false);
  });

  it("starts a new main preload when custom matching areas change", async () => {
    vi.useFakeTimers();
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );

    const first = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await first;

    const customMatchingAreas = { 8: "{}" };
    const second = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, customMatchingAreas);
    expect(second).not.toBe(first);
    await vi.runAllTimersAsync();
    await second;

    expect(adminDivisionAvailability.probeAdminDivisionCounts).toHaveBeenLastCalledWith(
      DUBLIN_CITY_GAME_AREA,
      customMatchingAreas,
      undefined,
      expect.anything(),
    );
  });

  it("re-probes category presence after a failed probe", async () => {
    vi.useFakeTimers();
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );
    vi.mocked(playAreaCategoryPresenceProbe.probePlayAreaCategoryCounts)
      .mockRejectedValueOnce(new OverpassUnavailableError())
      .mockResolvedValueOnce({ museum: 2 });

    const main = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    await main;
    await preloadCriticalGameAreaCaches(DUBLIN_CITY_GAME_AREA);

    expect(playAreaCategoryPresenceProbe.probePlayAreaCategoryCounts).toHaveBeenCalledTimes(2);
    expect(usePreloadStore.getState().categoryPresenceCounts).toEqual({ museum: 2 });
  });

  it("keeps a superseded run's late job out of the newer run's counts", async () => {
    vi.useFakeTimers();
    vi.spyOn(adminDivisionAvailability, "probeAdminDivisionCounts").mockResolvedValue(
      adminDivisionAvailability.emptyAdminDivisionCounts(),
    );
    let releaseHeldJob: (places: []) => void = () => {};
    vi.mocked(fetchMeasuringPlacesInArea).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseHeldJob = resolve;
        }),
    );

    const runA = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA);
    await vi.runAllTimersAsync();
    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(1);

    const runB = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, { 8: "{}" });
    expect(runB).not.toBe(runA);
    releaseHeldJob([]);
    await vi.runAllTimersAsync();
    await Promise.all([runA, runB]);

    const state = usePreloadStore.getState();
    expect(state.completedJobs).toBe(state.totalJobs);
    expect(selectPreloadBanner(state).loading).toBe(false);
  });

  it("reruns after session teardown and reports both runs", async () => {
    vi.useFakeTimers();

    const first = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    teardownSessionUiState();
    await vi.runAllTimersAsync();
    await first;

    expect(trackLazy).toHaveBeenCalledWith(
      "game_area_preload_finished",
      expect.objectContaining({ outcome: "aborted" }),
    );

    const second = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    expect(second).not.toBe(first);
    await vi.runAllTimersAsync();
    await second;

    const totalJobs = usePreloadStore.getState().totalJobs;
    expect(trackLazy).toHaveBeenLastCalledWith("game_area_preload_finished", {
      outcome: "completed",
      totalJobs,
      completedJobs: totalJobs,
      failedJobs: 0,
      durationMs: expect.any(Number),
    });
    expect(trackLazy).toHaveBeenCalledTimes(2);
  });

  it("pauses while the tab is hidden and resumes when it is visible again", async () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.mocked(fetchMeasuringPlacesInArea).mockImplementationOnce(async () => {
      visibility.mockReturnValue("hidden");
      return [];
    });

    const run = preloadGameAreaCachesAsync(DUBLIN_CITY_GAME_AREA, undefined, "dublin");
    await vi.runAllTimersAsync();

    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(1);
    expect(selectPreloadBanner(usePreloadStore.getState()).loading).toBe(true);

    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.runAllTimersAsync();
    await run;

    expect(fetchMeasuringPlacesInArea).toHaveBeenCalledTimes(
      preloadMeasuringCategoriesForTests().length,
    );
    expect(selectPreloadBanner(usePreloadStore.getState()).loading).toBe(false);
  });
});
