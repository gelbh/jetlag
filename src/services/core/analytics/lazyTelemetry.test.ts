import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncAnalyticsIdentity: vi.fn(),
  setBootstrapTag: vi.fn(),
  captureAuthBootstrapFailure: vi.fn(),
  captureAuthPersistenceFallback: vi.fn(),
}));

vi.mock("./analytics", () => ({
  syncAnalyticsIdentity: mocks.syncAnalyticsIdentity,
}));
vi.mock("./sentry", () => ({
  setBootstrapTag: mocks.setBootstrapTag,
  captureAuthBootstrapFailure: mocks.captureAuthBootstrapFailure,
  captureAuthPersistenceFallback: mocks.captureAuthPersistenceFallback,
}));

import {
  captureAuthBootstrapFailureLazy,
  captureAuthPersistenceFallbackLazy,
  setBootstrapTagLazy,
  syncAnalyticsIdentityLazy,
} from "./lazyTelemetry";

async function flush(): Promise<void> {
  await vi.dynamicImportSettled();
  await new Promise((r) => setTimeout(r, 0));
}

describe("lazyTelemetry", () => {
  it("forwards analytics identity", async () => {
    const user = { uid: "u1" } as Parameters<
      typeof syncAnalyticsIdentityLazy
    >[0];
    syncAnalyticsIdentityLazy(user);
    await flush();
    expect(mocks.syncAnalyticsIdentity).toHaveBeenCalledWith(user);
  });

  it("forwards sentry calls with their arguments in order", async () => {
    const err = new Error("x");
    setBootstrapTagLazy("auth_start");
    setBootstrapTagLazy("auth_ready");
    captureAuthBootstrapFailureLazy(err);
    captureAuthPersistenceFallbackLazy("memory", err);
    await vi.waitFor(() => {
      expect(mocks.captureAuthPersistenceFallback).toHaveBeenCalled();
      expect(mocks.setBootstrapTag).toHaveBeenCalledTimes(2);
    });
    expect(mocks.setBootstrapTag.mock.calls).toEqual([
      ["auth_start"],
      ["auth_ready"],
    ]);
    expect(mocks.captureAuthBootstrapFailure).toHaveBeenCalledWith(err);
    expect(mocks.captureAuthPersistenceFallback).toHaveBeenCalledWith(
      "memory",
      err,
    );
  });

  it("swallows errors thrown by the underlying module", async () => {
    mocks.setBootstrapTag.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      expect(() => setBootstrapTagLazy("render")).not.toThrow();
      await flush();
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      process.off("unhandledRejection", unhandled);
    }
    expect(unhandled).not.toHaveBeenCalled();
  });
});
