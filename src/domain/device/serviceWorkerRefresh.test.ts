import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyServiceWorkerUpdate,
  hasWaitingServiceWorker,
  promptIfWaiting,
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

  it("defers auto apply during an active map session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        pathname: "/map",
        hasActiveSession: true,
        dismissed: false,
      }),
    ).toBe(false);
  });

  it("allows auto apply on home without a session", () => {
    expect(
      shouldAutoApplyServiceWorkerUpdate({
        pathname: "/",
        hasActiveSession: false,
        dismissed: false,
      }),
    ).toBe(true);
  });
});
