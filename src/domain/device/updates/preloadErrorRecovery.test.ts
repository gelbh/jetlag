import { describe, expect, it, vi } from "vitest";
import {
  cancelPendingChunkReloadRetry,
  clearChunkReloadFlag,
  wasChunkReloadDeferred,
} from "./chunkLoadRecovery";
import { installPreloadErrorRecovery, isPreloadLoadFailure } from "./preloadErrorRecovery";

const CHUNK_ERROR = new TypeError(
  "Failed to fetch dynamically imported module: https://example.test/assets/Map-abc.js",
);

function setup(defer: (run: () => void) => void = (run) => run()) {
  const target = new EventTarget();
  const recover = vi.fn();
  installPreloadErrorRecovery({ target, recover, defer });
  const preloadError = (payload: unknown = CHUNK_ERROR) => {
    const event = Object.assign(new Event("vite:preloadError", { cancelable: true }), { payload });
    target.dispatchEvent(event);
    return event;
  };
  return { recover, preloadError };
}

describe("isPreloadLoadFailure", () => {
  it("accepts chunk fetch and CSS preload failures only", () => {
    expect(isPreloadLoadFailure(CHUNK_ERROR)).toBe(true);
    expect(isPreloadLoadFailure(new Error("Unable to preload CSS for /assets/a.css"))).toBe(true);
    expect(isPreloadLoadFailure(new TypeError("x is not a function"))).toBe(false);
    expect(isPreloadLoadFailure(undefined)).toBe(false);
  });
});

describe("installPreloadErrorRecovery", () => {
  it("recovers when online without swallowing the import error", () => {
    const { recover, preloadError } = setup();
    const event = preloadError();
    expect(recover).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores module errors that are not load failures", () => {
    const { recover, preloadError } = setup();
    preloadError(new TypeError("x is not a function"));
    expect(recover).not.toHaveBeenCalled();
  });

  it("defers recovery to a later task so the import's own handler runs first", () => {
    const deferred: Array<() => void> = [];
    const { recover, preloadError } = setup((run) => deferred.push(run));
    preloadError();
    expect(recover).not.toHaveBeenCalled();
    for (const run of deferred) run();
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("hands the injected offline check to the chunk-reload gate instead of reloading", () => {
    const target = new EventTarget();
    const isOffline = vi.fn(() => true);
    installPreloadErrorRecovery({ target, isOffline, defer: (run) => run() });
    target.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: CHUNK_ERROR }));
    expect(isOffline).toHaveBeenCalled();
    expect(wasChunkReloadDeferred()).toBe(true);
    cancelPendingChunkReloadRetry();
    clearChunkReloadFlag();
  });
});
