import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_LOCATION_FRESH_MS,
  clearLiveLocationReading,
  getFreshLiveLocationReading,
  getLiveLocationReadingSnapshot,
  publishLiveLocationReading,
  resetLiveLocationReadingForTests,
  subscribeLiveLocationReading,
} from "./liveLocationReading";

const sample = {
  lat: 53.35,
  lng: -6.26,
  accuracy: 5,
  heading: null,
};

describe("liveLocationReading", () => {
  afterEach(() => {
    resetLiveLocationReadingForTests();
  });

  it("publishes a reading with updatedAtMs", () => {
    publishLiveLocationReading(sample, 1_000);
    expect(getLiveLocationReadingSnapshot()).toEqual({
      reading: sample,
      updatedAtMs: 1_000,
    });
  });

  it("clears the snapshot", () => {
    publishLiveLocationReading(sample, 1_000);
    clearLiveLocationReading();
    expect(getLiveLocationReadingSnapshot()).toEqual({
      reading: null,
      updatedAtMs: null,
    });
  });

  it("getFreshLiveLocationReading returns reading within FRESH_MS", () => {
    publishLiveLocationReading(sample, 1_000);
    expect(getFreshLiveLocationReading(1_000 + LIVE_LOCATION_FRESH_MS)).toEqual(
      sample,
    );
    expect(
      getFreshLiveLocationReading(1_000 + LIVE_LOCATION_FRESH_MS + 1),
    ).toBeNull();
  });

  it("notifies subscribers on publish and clear", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLiveLocationReading(listener);
    publishLiveLocationReading(sample, 1_000);
    clearLiveLocationReading();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    publishLiveLocationReading(sample, 2_000);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
