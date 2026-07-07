import { describe, expect, it, vi } from "vitest";
import { registerAnnotationBackgroundSync } from "./backgroundSync";

describe("backgroundSync", () => {
  it("no-ops when service workers are unavailable", async () => {
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    await expect(registerAnnotationBackgroundSync()).resolves.toBeUndefined();

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: original,
    });
  });

  it("registers the annotation sync tag when supported", async () => {
    const register = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: { register },
        }),
      },
    });

    await registerAnnotationBackgroundSync();
    expect(register).toHaveBeenCalledWith("sync-annotations");
  });
});
