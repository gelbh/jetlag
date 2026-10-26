import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyServiceWorkerUpdate,
  hasWaitingServiceWorker,
  isSafeToReloadApp,
  maybeApplyPendingUpdate,
  promptIfWaiting,
  scheduleServiceWorkerUpdateChecks,
  shouldAutoApplyServiceWorkerUpdate,
} from "./serviceWorkerRefresh";

function stubReloadAndController() {
  const reload = vi.fn();
  const listeners = new Map<string, Set<EventListener>>();
  const originalLocation = window.location;
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    "serviceWorker",
  );
  const hadOwnServiceWorker = Object.hasOwn(navigator, "serviceWorker");
  const previousOwnServiceWorker = hadOwnServiceWorker
    ? (navigator as Navigator & { serviceWorker?: unknown }).serviceWorker
    : undefined;

  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload },
  });

  const serviceWorker = {
    addEventListener(type: string, listener: EventListener) {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
  };

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    writable: true,
    value: serviceWorker,
  });

  return {
    reload,
    dispatchControllerChange() {
      for (const listener of listeners.get("controllerchange") ?? []) {
        listener(new Event("controllerchange"));
      }
    },
    restore() {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
      if (hadOwnServiceWorker) {
        Object.defineProperty(navigator, "serviceWorker", {
          configurable: true,
          writable: true,
          value: previousOwnServiceWorker,
        });
      } else {
        Reflect.deleteProperty(navigator, "serviceWorker");
        if (originalServiceWorker) {
          Object.defineProperty(Navigator.prototype, "serviceWorker", originalServiceWorker);
        }
      }
    },
  };
}

describe("serviceWorkerRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects a waiting service worker", () => {
    expect(hasWaitingServiceWorker(undefined)).toBe(false);
    expect(hasWaitingServiceWorker({ waiting: {} } as ServiceWorkerRegistration)).toBe(true);
  });

  it("prompts when a worker is waiting", () => {
    const onNeedRefresh = vi.fn();
    promptIfWaiting(undefined, onNeedRefresh);
    expect(onNeedRefresh).not.toHaveBeenCalled();

    promptIfWaiting({ waiting: {} } as ServiceWorkerRegistration, onNeedRefresh);
    expect(onNeedRefresh).toHaveBeenCalledOnce();
  });

  it("schedules periodic update checks", () => {
    const onNeedRefresh = vi.fn();
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const stop = scheduleServiceWorkerUpdateChecks(registration, onNeedRefresh);
    expect(registration.update).not.toHaveBeenCalled();

    vi.advanceTimersByTime(45 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledOnce();

    stop();
    vi.advanceTimersByTime(45 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it("reloads early on controllerchange and does not double-reload on fallback", async () => {
    const stub = stubReloadAndController();
    try {
      const postMessage = vi.fn();
      const registration = {
        waiting: { postMessage },
      } as unknown as ServiceWorkerRegistration;

      await applyServiceWorkerUpdate(registration);
      expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
      expect(stub.reload).not.toHaveBeenCalled();

      stub.dispatchControllerChange();
      expect(stub.reload).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1500);
      expect(stub.reload).toHaveBeenCalledOnce();
    } finally {
      stub.restore();
    }
  });

  it("falls back to reload after 1500ms when controllerchange never fires", async () => {
    const stub = stubReloadAndController();
    try {
      const postMessage = vi.fn();
      const registration = {
        waiting: { postMessage },
      } as unknown as ServiceWorkerRegistration;

      await applyServiceWorkerUpdate(registration);
      expect(stub.reload).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1500);
      expect(stub.reload).toHaveBeenCalledOnce();
    } finally {
      stub.restore();
    }
  });

  it("uses the register updater only and never posts SKIP_WAITING to waiting", async () => {
    const stub = stubReloadAndController();
    try {
      const postMessage = vi.fn();
      const registration = {
        waiting: { postMessage },
      } as unknown as ServiceWorkerRegistration;
      const registerApplyUpdate = vi.fn().mockResolvedValue(undefined);

      await applyServiceWorkerUpdate(registration, registerApplyUpdate);
      expect(registerApplyUpdate).toHaveBeenCalledWith(true);
      expect(postMessage).not.toHaveBeenCalled();
      expect(stub.reload).not.toHaveBeenCalled();

      stub.dispatchControllerChange();
      expect(stub.reload).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1500);
      expect(stub.reload).toHaveBeenCalledOnce();
    } finally {
      stub.restore();
    }
  });

  it("posts SKIP_WAITING once when no register updater is provided", async () => {
    const stub = stubReloadAndController();
    try {
      const postMessage = vi.fn();
      const registration = {
        waiting: { postMessage },
      } as unknown as ServiceWorkerRegistration;

      await applyServiceWorkerUpdate(registration);
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: "SKIP_WAITING" });
    } finally {
      stub.restore();
    }
  });

  it("propagates updater rejection and still schedules the fallback reload", async () => {
    const stub = stubReloadAndController();
    try {
      const registerApplyUpdate = vi.fn().mockRejectedValue(new Error("nope"));
      await expect(applyServiceWorkerUpdate(undefined, registerApplyUpdate)).rejects.toThrow(
        "nope",
      );

      expect(stub.reload).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1500);
      expect(stub.reload).toHaveBeenCalledOnce();
    } finally {
      stub.restore();
    }
  });

  it("reloads immediately when there is no waiting worker and no updater", async () => {
    const stub = stubReloadAndController();
    try {
      await applyServiceWorkerUpdate(undefined);
      expect(stub.reload).toHaveBeenCalledOnce();
    } finally {
      stub.restore();
    }
  });

  it("defers auto apply on the map with an active session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: { id: "session-1" },
      }),
    ).toBe(false);
  });

  it("allows auto apply on the map without a session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: null,
      }),
    ).toBe(true);
  });

  it("defers auto apply on home while a session is still active", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: { id: "session-1" },
      }),
    ).toBe(false);
  });

  it("treats a safe window as reloadable", () => {
    expect(
      isSafeToReloadApp({
        session: null,
      }),
    ).toBe(true);
  });

  it("treats an active session as unsafe to reload", () => {
    expect(
      isSafeToReloadApp({
        session: { id: "session-1" },
      }),
    ).toBe(false);
  });

  it("applies a pending update only in a safe window", async () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    const registration = {
      waiting: { postMessage: vi.fn() },
    } as unknown as ServiceWorkerRegistration;

    await maybeApplyPendingUpdate({
      needsRefresh: true,
      session: { id: "session-1" },
      registration,
      applyUpdate,
    });
    expect(applyUpdate).not.toHaveBeenCalled();

    await maybeApplyPendingUpdate({
      needsRefresh: true,
      session: null,
      registration,
      applyUpdate,
    });
    expect(applyUpdate).toHaveBeenCalledWith(true);
  });

  it("skips pending update application when refresh is not needed", async () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);

    await maybeApplyPendingUpdate({
      needsRefresh: false,
      session: null,
      registration: undefined,
      applyUpdate,
    });

    expect(applyUpdate).not.toHaveBeenCalled();
  });
});
