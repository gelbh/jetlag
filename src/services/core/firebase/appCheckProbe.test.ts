import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_CHECK_PROBE_SKIP_KEY,
  APP_CHECK_PROBE_TIMEOUT_MS,
  probeAppCheckAvailability,
  resetAppCheckProbeForTests,
  shouldSkipAppCheckProbe,
} from "./appCheckProbe";
import { captureAppCheckTokenFailure } from "../analytics/sentry";

const { getFirebaseAppCheck, getToken, isFirebaseConfigured, getClientEnv } =
  vi.hoisted(() => ({
    getFirebaseAppCheck: vi.fn(),
    getToken: vi.fn(),
    isFirebaseConfigured: vi.fn(() => true),
    getClientEnv: vi.fn(() => ({
      VITE_FIREBASE_APP_CHECK_SITE_KEY: "test-site-key",
    })),
  }));

vi.mock("firebase/app-check", () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}));

vi.mock("./firebase", () => ({
  getFirebaseAppCheck: () => getFirebaseAppCheck(),
  isFirebaseConfigured: () => isFirebaseConfigured(),
}));

vi.mock("../../../config/env", () => ({
  getClientEnv: () => getClientEnv(),
}));

vi.mock("../analytics/sentry", () => ({
  captureAppCheckTokenFailure: vi.fn(),
}));

describe("appCheckProbe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppCheckProbeForTests();
    window.sessionStorage.clear();
    delete window.__JETLAG_E2E__;
    isFirebaseConfigured.mockReturnValue(true);
    getClientEnv.mockReturnValue({
      VITE_FIREBASE_APP_CHECK_SITE_KEY: "test-site-key",
    });
    getFirebaseAppCheck.mockReturnValue({ appCheck: true });
    getToken.mockResolvedValue({ token: "ok-token" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips when sessionStorage skip flag is set", () => {
    window.sessionStorage.setItem(APP_CHECK_PROBE_SKIP_KEY, "1");
    expect(shouldSkipAppCheckProbe()).toBe(true);
  });

  it("returns ok when App Check is not configured", async () => {
    getClientEnv.mockReturnValue({ VITE_FIREBASE_APP_CHECK_SITE_KEY: "" });
    await expect(probeAppCheckAvailability()).resolves.toEqual({ ok: true });
    expect(getToken).not.toHaveBeenCalled();
  });

  it("returns ok when a token is minted", async () => {
    await expect(probeAppCheckAvailability()).resolves.toEqual({ ok: true });
  });

  it("returns blocked when token is empty", async () => {
    getToken.mockResolvedValueOnce({ token: "" });
    await expect(probeAppCheckAvailability()).resolves.toEqual({
      ok: false,
      reason: "blocked",
    });
  });

  it("returns blocked on fetch-style failures", async () => {
    getToken.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(probeAppCheckAvailability()).resolves.toEqual({
      ok: false,
      reason: "blocked",
    });
  });

  it("soft-fails unknown errors so the app still loads", async () => {
    getToken.mockRejectedValueOnce(new Error("Internal App Check glitch"));
    await expect(probeAppCheckAvailability()).resolves.toEqual({ ok: true });
    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ reason: "error", soft: true }),
    );
  });

  it("soft-fails initial-throttle without treating as blocked", async () => {
    getToken.mockRejectedValueOnce(
      new Error(
        "AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).",
      ),
    );
    await expect(probeAppCheckAvailability()).resolves.toEqual({ ok: true });
    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ reason: "error", soft: true }),
    );
  });

  it("keeps hard capture for blocked empty token", async () => {
    getToken.mockResolvedValueOnce({ token: "" });
    await expect(probeAppCheckAvailability()).resolves.toEqual({
      ok: false,
      reason: "blocked",
    });
    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ reason: "blocked", soft: false }),
    );
  });

  it("caches the first result", async () => {
    await probeAppCheckAvailability();
    await probeAppCheckAvailability();
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent probes while one is in flight", async () => {
    let resolveToken: (value: { token: string }) => void = () => {};
    getToken.mockImplementationOnce(
      () =>
        new Promise<{ token: string }>((resolve) => {
          resolveToken = resolve;
        }),
    );

    const first = probeAppCheckAvailability();
    const second = probeAppCheckAvailability();
    expect(getToken).toHaveBeenCalledTimes(1);
    resolveToken({ token: "ok-token" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
  });

  it("soft-fails when the probe times out", async () => {
    vi.useFakeTimers();
    getToken.mockImplementationOnce(() => new Promise(() => {}));

    const probePromise = probeAppCheckAvailability();
    await vi.advanceTimersByTimeAsync(APP_CHECK_PROBE_TIMEOUT_MS);
    await expect(probePromise).resolves.toEqual({ ok: true });
    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ reason: "timeout", soft: true }),
    );
  });
});
