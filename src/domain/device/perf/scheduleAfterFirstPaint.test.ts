import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scheduleAfterFirstPaint,
  scheduleIdleBootWork,
} from "./scheduleAfterFirstPaint";

describe("scheduleAfterFirstPaint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs callback after two animation frames", () => {
    const callback = vi.fn();
    const pending: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => {
      pending.push(cb);
      return pending.length;
    });
    vi.stubGlobal("requestAnimationFrame", raf);

    scheduleAfterFirstPaint(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalledTimes(1);

    pending.shift()?.(0);
    expect(raf).toHaveBeenCalledTimes(2);
    expect(callback).not.toHaveBeenCalled();

    pending.shift()?.(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("falls back to setTimeout when rAF is missing", () => {
    vi.stubGlobal("requestAnimationFrame", undefined);
    const callback = vi.fn();

    scheduleAfterFirstPaint(callback);

    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleIdleBootWork", () => {
  it("uses requestIdleCallback when available", () => {
    const callback = vi.fn();
    const idle = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", idle);

    scheduleIdleBootWork(callback);

    expect(idle).toHaveBeenCalledWith(callback, { timeout: 2_000 });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("falls back to setTimeout when idle callback is missing", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const callback = vi.fn();

    scheduleIdleBootWork(callback);

    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
