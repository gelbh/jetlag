import { describe, expect, it, vi } from "vitest";
import { tryUpdateServiceWorker } from "./serviceWorkerUpdate";

function mockRegistration(
  overrides: Partial<ServiceWorkerRegistration> = {},
): ServiceWorkerRegistration {
  return {
    installing: null,
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

describe("tryUpdateServiceWorker", () => {
  it("skips when registration is undefined", () => {
    expect(() => tryUpdateServiceWorker(undefined)).not.toThrow();
  });

  it("skips when a worker is installing", () => {
    const registration = mockRegistration({
      installing: {} as ServiceWorker,
    });

    tryUpdateServiceWorker(registration);

    expect(registration.update).not.toHaveBeenCalled();
  });

  it("swallows synchronous InvalidStateError from update()", () => {
    const registration = mockRegistration({
      update: vi.fn(() => {
        throw new DOMException("newestWorker is null", "InvalidStateError");
      }),
    });

    expect(() => tryUpdateServiceWorker(registration)).not.toThrow();
  });

  it("swallows rejected update() promises", async () => {
    const registration = mockRegistration({
      update: vi.fn(() =>
        Promise.reject(
          new DOMException("newestWorker is null", "InvalidStateError"),
        ),
      ),
    });

    expect(() => tryUpdateServiceWorker(registration)).not.toThrow();
    await Promise.resolve();
  });

  it("calls update when registration is ready", () => {
    const registration = mockRegistration();

    tryUpdateServiceWorker(registration);

    expect(registration.update).toHaveBeenCalledOnce();
  });
});
