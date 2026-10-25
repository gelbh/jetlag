import { afterEach, describe, expect, it, vi } from "vitest";
import {
  awaitFreshLiveLocationReading,
  clearLiveLocationReading,
  getFreshLiveLocationReading,
  getLiveLocationReadingSnapshot,
  hasLiveLocationRetainers,
  LIVE_LOCATION_FRESH_MS,
  LIVE_WAIT_AFTER_TIMEOUT_MS,
  LIVE_WAIT_BEFORE_ONESHOT_MS,
  publishLiveLocationReading,
  releaseLiveLocationReading,
  resetLiveLocationReadingForTests,
  retainLiveLocationReading,
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
    expect(getFreshLiveLocationReading(1_000 + LIVE_LOCATION_FRESH_MS)).toEqual(sample);
    expect(getFreshLiveLocationReading(1_000 + LIVE_LOCATION_FRESH_MS + 1)).toBeNull();
  });

  it("keeps snapshot until the last retain is released", () => {
    publishLiveLocationReading(sample, 1_000);
    retainLiveLocationReading();
    retainLiveLocationReading();
    releaseLiveLocationReading();
    expect(getLiveLocationReadingSnapshot().reading).toEqual(sample);
    releaseLiveLocationReading();
    expect(getLiveLocationReadingSnapshot().reading).toBeNull();
  });

  it("hard clear drops snapshot without resetting retain count", () => {
    retainLiveLocationReading();
    publishLiveLocationReading(sample, 1_000);
    clearLiveLocationReading();
    expect(getLiveLocationReadingSnapshot().reading).toBeNull();
    publishLiveLocationReading(sample, 2_000);
    expect(getLiveLocationReadingSnapshot().reading).toEqual(sample);
    releaseLiveLocationReading();
    expect(getLiveLocationReadingSnapshot().reading).toBeNull();
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

  it("exports wait constants from the design", () => {
    expect(LIVE_WAIT_BEFORE_ONESHOT_MS).toBe(8_000);
    expect(LIVE_WAIT_AFTER_TIMEOUT_MS).toBe(5_000);
  });

  it("hasLiveLocationRetainers tracks retain/release", () => {
    expect(hasLiveLocationRetainers()).toBe(false);
    retainLiveLocationReading();
    expect(hasLiveLocationRetainers()).toBe(true);
    releaseLiveLocationReading();
    expect(hasLiveLocationRetainers()).toBe(false);
  });

  it("awaitFreshLiveLocationReading resolves immediately when already fresh", async () => {
    publishLiveLocationReading(sample, 1_000);
    await expect(awaitFreshLiveLocationReading(5_000, () => 1_000)).resolves.toEqual(sample);
  });

  it("awaitFreshLiveLocationReading resolves when publish arrives before deadline", async () => {
    vi.useFakeTimers();
    const pending = awaitFreshLiveLocationReading(5_000, () => Date.now());
    queueMicrotask(() => {
      publishLiveLocationReading(sample, Date.now());
    });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual(sample);
    vi.useRealTimers();
  });

  it("awaitFreshLiveLocationReading resolves null when deadline elapses", async () => {
    vi.useFakeTimers();
    const pending = awaitFreshLiveLocationReading(1_000, () => Date.now());
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });
});
