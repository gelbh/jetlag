// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindOfflineQueueResumeFlush,
  shouldFlushOfflineQueueOnPageShow,
  shouldFlushOfflineQueueOnVisibility,
} from "./sessionResumeFlush";

describe("sessionResumeFlush", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushes when document becomes visible", () => {
    const flush = vi.fn();
    const unbind = bindOfflineQueueResumeFlush(flush);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(flush).toHaveBeenCalledTimes(1);
    unbind();
  });

  it("does not flush when document stays hidden", () => {
    const flush = vi.fn();
    const unbind = bindOfflineQueueResumeFlush(flush);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(flush).not.toHaveBeenCalled();
    unbind();
  });

  it("flushes on pageshow when restored from bfcache", () => {
    const flush = vi.fn();
    const unbind = bindOfflineQueueResumeFlush(flush);

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));

    expect(flush).toHaveBeenCalledTimes(1);
    unbind();
  });

  it("ignores pageshow without bfcache restore", () => {
    const flush = vi.fn();
    const unbind = bindOfflineQueueResumeFlush(flush);

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));

    expect(flush).not.toHaveBeenCalled();
    unbind();
  });

  it("shouldFlushOfflineQueueOnVisibility reflects document state", () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    expect(shouldFlushOfflineQueueOnVisibility()).toBe(true);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    expect(shouldFlushOfflineQueueOnVisibility()).toBe(false);
  });

  it("shouldFlushOfflineQueueOnPageShow requires persisted bfcache", () => {
    expect(
      shouldFlushOfflineQueueOnPageShow(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    ).toBe(true);
    expect(
      shouldFlushOfflineQueueOnPageShow(
        new PageTransitionEvent("pageshow", { persisted: false }),
      ),
    ).toBe(false);
  });
});
