import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unregisterDevServiceWorkers } from "./unregisterDevServiceWorkers";

describe("unregisterDevServiceWorkers", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns false when no service workers are registered", async () => {
    const getRegistrations = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations },
    });

    await expect(unregisterDevServiceWorkers()).resolves.toBe(false);
  });

  it("unregisters workers and clears caches", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations },
    });
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["workbox-precache"]),
      delete: deleteCache,
    });

    await expect(unregisterDevServiceWorkers()).resolves.toBe(true);
    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith("workbox-precache");
  });
});
