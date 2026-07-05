import { beforeEach, describe, expect, it } from "vitest";
import { selectPreloadBanner, usePreloadStore } from "./preloadStore";

describe("preloadStore", () => {
  beforeEach(() => {
    usePreloadStore.setState({
      activeGameAreaKey: null,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      dismissed: false,
    });
  });

  it("shows loading banner while jobs are in progress", () => {
    usePreloadStore.getState().reset("area-1", 3);
    usePreloadStore.getState().recordSuccess("area-1");

    expect(selectPreloadBanner(usePreloadStore.getState())).toEqual({
      visible: true,
      loading: true,
      failed: false,
      label: "Loading map data (1/3)…",
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
      label: "Some map data failed — tools may be slower until you retry.",
    });
  });

  it("hides banner after dismiss", () => {
    usePreloadStore.getState().reset("area-1", 1);
    usePreloadStore.getState().recordFailure("area-1");
    usePreloadStore.getState().dismiss();

    expect(selectPreloadBanner(usePreloadStore.getState()).visible).toBe(false);
  });
});
