import { beforeEach, describe, expect, it } from "vitest";
import { selectPreloadBanner, usePreloadStore } from "./preloadStore";

describe("preloadStore", () => {
  beforeEach(() => {
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

  it("stores category presence counts for the active game area and clears on reset", () => {
    usePreloadStore.getState().reset("area-1", 1);
    usePreloadStore.getState().setCategoryPresenceCounts("area-1", { zoo: 0, museum: 3 });

    expect(usePreloadStore.getState().categoryPresenceCounts).toEqual({ zoo: 0, museum: 3 });

    usePreloadStore.getState().setCategoryPresenceCounts("other-area", { zoo: 9 });
    expect(usePreloadStore.getState().categoryPresenceCounts).toEqual({ zoo: 0, museum: 3 });

    usePreloadStore.getState().reset("area-2", 2);
    expect(usePreloadStore.getState().categoryPresenceCounts).toBeNull();
  });

  it("shows loading banner while jobs are in progress", () => {
    usePreloadStore.getState().reset("area-1", 3);
    usePreloadStore.getState().recordSuccess("area-1");

    expect(selectPreloadBanner(usePreloadStore.getState())).toEqual({
      visible: true,
      loading: true,
      failed: false,
      completedJobs: 1,
      totalJobs: 3,
      title: "Map preload",
      body: "Caching coastlines, transit, and tool data for this play area.",
    });
  });

  it("shows failure banner after a job fails", () => {
    usePreloadStore.getState().reset("area-1", 2);
    usePreloadStore.getState().recordFailure("area-1");
    usePreloadStore.getState().recordSuccess("area-1");

    expect(selectPreloadBanner(usePreloadStore.getState())).toEqual({
      visible: true,
      loading: false,
      failed: true,
      completedJobs: 2,
      totalJobs: 2,
      title: "Preload incomplete",
      body: "Some caches failed. Tools may run slower until the next session.",
    });
  });

  it("hides banner after dismiss", () => {
    usePreloadStore.getState().reset("area-1", 1);
    usePreloadStore.getState().recordFailure("area-1");
    usePreloadStore.getState().dismiss();

    expect(selectPreloadBanner(usePreloadStore.getState()).visible).toBe(false);
  });
});

describe("preloadStore critical slice", () => {
  beforeEach(() => {
    usePreloadStore.setState({
      activeGameAreaKey: null,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      critical: null,
      dismissed: false,
      adminDivisionCounts: null,
    });
  });

  it("shows critical jobs before the main preload starts", () => {
    usePreloadStore.getState().resetCritical("area-1", 3);
    usePreloadStore.getState().recordCriticalJob("area-1", "success");

    expect(selectPreloadBanner(usePreloadStore.getState())).toMatchObject({
      visible: true,
      loading: true,
      completedJobs: 1,
      totalJobs: 3,
    });
  });

  it("survives the main preload reset and sums with it", () => {
    usePreloadStore.getState().resetCritical("area-1", 3);
    usePreloadStore.getState().recordCriticalJob("area-1", "success");
    usePreloadStore.getState().reset("area-1", 5);
    usePreloadStore.getState().recordSuccess("area-1");

    expect(usePreloadStore.getState().critical).toMatchObject({ totalJobs: 3, completedJobs: 1 });
    expect(selectPreloadBanner(usePreloadStore.getState())).toMatchObject({
      completedJobs: 2,
      totalJobs: 8,
    });
  });

  it("ignores jobs for another play area", () => {
    usePreloadStore.getState().resetCritical("area-1", 2);
    usePreloadStore.getState().recordCriticalJob("area-2", "failure");
    expect(usePreloadStore.getState().critical).toMatchObject({ completedJobs: 0, failedJobs: 0 });

    usePreloadStore.getState().reset("area-2", 1);
    expect(selectPreloadBanner(usePreloadStore.getState()).totalJobs).toBe(1);
  });

  it("reports a failed critical job once all jobs settle", () => {
    usePreloadStore.getState().resetCritical("area-1", 2);
    usePreloadStore.getState().recordCriticalJob("area-1", "success");
    usePreloadStore.getState().recordCriticalJob("area-1", "failure");

    expect(selectPreloadBanner(usePreloadStore.getState())).toMatchObject({
      visible: true,
      loading: false,
      failed: true,
    });
  });
});
