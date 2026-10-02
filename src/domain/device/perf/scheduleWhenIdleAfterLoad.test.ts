import { describe, expect, it, vi } from "vitest";
import {
  IDLE_AFTER_LOAD_TIMEOUT_MS,
  type IdleAfterLoadHost,
  scheduleWhenIdleAfterLoad,
} from "./scheduleWhenIdleAfterLoad";

function createHost(options: { readyState: string; idle?: boolean }) {
  const loadListeners = new Set<() => void>();
  const idleCallbacks = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();
  let nextHandle = 1;

  const host = {
    document: { readyState: options.readyState },
    addEventListener: vi.fn((_type: "load", listener: () => void) => {
      loadListeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: "load", listener: () => void) => {
      loadListeners.delete(listener);
    }),
    setTimeout: vi.fn((callback: () => void) => {
      const handle = nextHandle++;
      timeouts.set(handle, callback);
      return handle;
    }),
    clearTimeout: vi.fn((handle: number) => {
      timeouts.delete(handle);
    }),
    ...(options.idle === false
      ? {}
      : {
          requestIdleCallback: vi.fn((callback: () => void) => {
            const handle = nextHandle++;
            idleCallbacks.set(handle, callback);
            return handle;
          }),
          cancelIdleCallback: vi.fn((handle: number) => {
            idleCallbacks.delete(handle);
          }),
        }),
  } satisfies IdleAfterLoadHost;

  return {
    host,
    fireLoad() {
      host.document.readyState = "complete";
      const listeners = [...loadListeners];
      loadListeners.clear();
      for (const listener of listeners) {
        listener();
      }
    },
    flushIdle() {
      const callbacks = [...idleCallbacks.values()];
      idleCallbacks.clear();
      for (const callback of callbacks) {
        callback();
      }
    },
    flushTimeouts() {
      const callbacks = [...timeouts.values()];
      timeouts.clear();
      for (const callback of callbacks) {
        callback();
      }
    },
    pendingLoadListeners: () => loadListeners.size,
  };
}

describe("scheduleWhenIdleAfterLoad", () => {
  it("waits for load, then idle, and runs exactly once", () => {
    const fake = createHost({ readyState: "interactive" });
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback, { host: fake.host });

    expect(fake.host.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), {
      once: true,
    });
    fake.flushIdle();
    expect(callback).not.toHaveBeenCalled();

    fake.fireLoad();
    expect(callback).not.toHaveBeenCalled();
    expect(fake.host.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: IDLE_AFTER_LOAD_TIMEOUT_MS,
    });

    fake.flushIdle();
    fake.flushIdle();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("skips the load wait when the document already loaded", () => {
    const fake = createHost({ readyState: "complete" });
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback, { host: fake.host, timeoutMs: 500 });

    expect(fake.host.addEventListener).not.toHaveBeenCalled();
    expect(fake.host.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 500,
    });
    fake.flushIdle();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("falls back to setTimeout when requestIdleCallback is missing", () => {
    const fake = createHost({ readyState: "loading", idle: false });
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback, { host: fake.host });
    fake.flushTimeouts();
    expect(callback).not.toHaveBeenCalled();

    fake.fireLoad();
    expect(fake.host.setTimeout).toHaveBeenCalledTimes(1);
    fake.flushTimeouts();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cancels before load without running", () => {
    const fake = createHost({ readyState: "loading" });
    const callback = vi.fn();

    const cancel = scheduleWhenIdleAfterLoad(callback, { host: fake.host });
    cancel();

    expect(fake.pendingLoadListeners()).toBe(0);
    fake.fireLoad();
    fake.flushIdle();
    expect(callback).not.toHaveBeenCalled();
  });

  it("cancels a pending idle callback after load", () => {
    const fake = createHost({ readyState: "complete" });
    const callback = vi.fn();

    const cancel = scheduleWhenIdleAfterLoad(callback, { host: fake.host });
    cancel();

    expect(fake.host.cancelIdleCallback).toHaveBeenCalledTimes(1);
    fake.flushIdle();
    expect(callback).not.toHaveBeenCalled();
  });
});
