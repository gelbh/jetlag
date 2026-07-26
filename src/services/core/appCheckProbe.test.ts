import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_CHECK_PROBE_SKIP_KEY,
  probeAppCheckAvailability,
  resetAppCheckProbeForTests,
  shouldSkipAppCheckProbe,
} from "./appCheckProbe";

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

vi.mock("../../config/env", () => ({
  getClientEnv: () => getClientEnv(),
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

  it("caches the first result", async () => {
    await probeAppCheckAvailability();
    await probeAppCheckAvailability();
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
