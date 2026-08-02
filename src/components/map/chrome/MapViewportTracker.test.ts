import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThrottledPublisher,
  VIEWPORT_PUBLISH_THROTTLE_MS,
} from "../helpers/mapViewportPublish";
import { VIEWPORT_PUBLISH_BY_PHASE } from "./MapViewportTracker";

describe("createThrottledPublisher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces schedule calls within the throttle window", () => {
    const publish = vi.fn();
    const publisher = createThrottledPublisher(publish, VIEWPORT_PUBLISH_THROTTLE_MS);

    publisher.schedule();
    publisher.schedule();
    publisher.schedule();

    expect(publish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(VIEWPORT_PUBLISH_THROTTLE_MS - 1);
    expect(publish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately and cancels a pending schedule", () => {
    const publish = vi.fn();
    const publisher = createThrottledPublisher(publish, VIEWPORT_PUBLISH_THROTTLE_MS);

    publisher.schedule();
    publisher.flush();

    expect(publish).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(VIEWPORT_PUBLISH_THROTTLE_MS);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});

describe("VIEWPORT_PUBLISH_BY_PHASE", () => {
  it("schedules on pinch-style zoom and move without requiring drag", () => {
    expect(VIEWPORT_PUBLISH_BY_PHASE.zoom).toBe("schedule");
    expect(VIEWPORT_PUBLISH_BY_PHASE.move).toBe("schedule");
    expect(VIEWPORT_PUBLISH_BY_PHASE.moveend).toBe("schedule");
  });

  it("flushes on gesture settle", () => {
    expect(VIEWPORT_PUBLISH_BY_PHASE.zoomend).toBe("flush");
    expect(VIEWPORT_PUBLISH_BY_PHASE.dragend).toBe("flush");
  });
});
