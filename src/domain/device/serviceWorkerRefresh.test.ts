import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyServiceWorkerUpdate,
  getServiceWorkerApplyContext,
  hasWaitingServiceWorker,
  isSafeToReloadApp,
  maybeApplyPendingUpdate,
  promptIfWaiting,
  registerServiceWorkerApplyContext,
  scheduleServiceWorkerUpdateChecks,
  shouldAutoApplyServiceWorkerUpdate,
} from "./serviceWorkerRefresh";

describe("serviceWorkerRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects a waiting service worker", () => {
    expect(hasWaitingServiceWorker(undefined)).toBe(false);
    expect(
      hasWaitingServiceWorker({ waiting: {} } as ServiceWorkerRegistration),
    ).toBe(true);
  });

  it("prompts when a worker is waiting", () => {
    const onNeedRefresh = vi.fn();
    promptIfWaiting(undefined, onNeedRefresh);
    expect(onNeedRefresh).not.toHaveBeenCalled();

    promptIfWaiting(
      { waiting: {} } as ServiceWorkerRegistration,
      onNeedRefresh,
    );
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

  it("reloads after skip-waiting when no register callback is provided", async () => {
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    try {
      const postMessage = vi.fn();
      const registration = {
        waiting: { postMessage },
      } as unknown as ServiceWorkerRegistration;

      await applyServiceWorkerUpdate(registration);
      expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
      expect(reload).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1500);
      expect(reload).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("delegates reload to the PWA register callback when provided", async () => {
    const registerApplyUpdate = vi.fn().mockResolvedValue(undefined);
    await applyServiceWorkerUpdate(undefined, registerApplyUpdate);
    expect(registerApplyUpdate).toHaveBeenCalledWith(true);
  });

  it("defers auto apply on the map with an active session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: { id: "session-1" },
        pathname: "/map",
      }),
    ).toBe(false);
  });

  it("allows auto apply on the map without a session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: null,
        pathname: "/map",
      }),
    ).toBe(true);
  });

  it("allows auto apply off the map with an active session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        session: { id: "session-1" },
        pathname: "/",
      }),
    ).toBe(true);
  });

  it("treats a safe window as reloadable", () => {
    expect(
      isSafeToReloadApp({
        session: null,
        pathname: "/map",
      }),
    ).toBe(true);

    expect(
      isSafeToReloadApp({
        session: { id: "session-1" },
        pathname: "/",
      }),
    ).toBe(true);
  });

  it("treats an active map session as unsafe to reload", () => {
    expect(
      isSafeToReloadApp({
        session: { id: "session-1" },
        pathname: "/map",
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
      pathname: "/map",
      registration,
      applyUpdate,
    });
    expect(applyUpdate).not.toHaveBeenCalled();

    await maybeApplyPendingUpdate({
      needsRefresh: true,
      session: null,
      pathname: "/map",
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
      pathname: "/",
      registration: undefined,
      applyUpdate,
    });

    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it("exposes the registered service worker apply context", () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    const registration = {
      waiting: { postMessage: vi.fn() },
    } as unknown as ServiceWorkerRegistration;

    const unregister = registerServiceWorkerApplyContext(
      registration,
      applyUpdate,
    );

    expect(getServiceWorkerApplyContext()).toEqual({
      registration,
      applyUpdate,
    });

    unregister();

    expect(getServiceWorkerApplyContext()).toEqual({
      registration: undefined,
      applyUpdate: undefined,
    });
  });
});
