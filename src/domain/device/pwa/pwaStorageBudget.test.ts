import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isStorageOverSoftCap,
  PWA_SOFT_STORAGE_BYTES,
  PWA_TILE_CACHE_MAX_AGE_SECONDS,
  PWA_TILE_CACHE_MAX_ENTRIES,
  readStorageEstimate,
  reportStoragePressureIfHigh,
} from "./pwaStorageBudget";

describe("pwaStorageBudget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps tile cache caps at play-day defaults", () => {
    expect(PWA_TILE_CACHE_MAX_ENTRIES).toBe(500);
    expect(PWA_TILE_CACHE_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 7);
  });

  it("detects usage over the soft storage cap", () => {
    expect(isStorageOverSoftCap(PWA_SOFT_STORAGE_BYTES - 1)).toBe(false);
    expect(isStorageOverSoftCap(PWA_SOFT_STORAGE_BYTES)).toBe(true);
  });

  it("returns null when storage estimate is unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(readStorageEstimate()).resolves.toBeNull();
  });

  it("reports pressure when usage exceeds the soft cap", async () => {
    const onPressure = vi.fn();
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn(async () => ({
          usage: PWA_SOFT_STORAGE_BYTES + 1,
          quota: PWA_SOFT_STORAGE_BYTES * 2,
        })),
      },
    });

    const snapshot = await reportStoragePressureIfHigh({
      source: "client",
      onPressure,
    });

    expect(snapshot?.usage).toBeGreaterThan(PWA_SOFT_STORAGE_BYTES);
    expect(onPressure).toHaveBeenCalledWith(snapshot);
  });

  it("skips pressure callback when usage is under cap", async () => {
    const onPressure = vi.fn();
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn(async () => ({
          usage: PWA_SOFT_STORAGE_BYTES - 1,
          quota: PWA_SOFT_STORAGE_BYTES * 2,
        })),
      },
    });

    await reportStoragePressureIfHigh({ source: "client", onPressure });

    expect(onPressure).not.toHaveBeenCalled();
  });
});
