import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncAnalyticsIdentity: vi.fn(),
  trackPageView: vi.fn(),
  grantAnalyticsConsent: vi.fn(),
  denyAnalyticsConsent: vi.fn(),
  captureException: vi.fn(),
  captureErrorBoundaryException: vi.fn(),
  captureAuthBootstrapFailure: vi.fn(),
  captureAuthPersistenceFallback: vi.fn(),
}));

vi.mock("./analytics", () => ({
  syncAnalyticsIdentity: mocks.syncAnalyticsIdentity,
  trackPageView: mocks.trackPageView,
  grantAnalyticsConsent: mocks.grantAnalyticsConsent,
  denyAnalyticsConsent: mocks.denyAnalyticsConsent,
}));
vi.mock("./clientErrors", () => ({
  captureAuthBootstrapFailure: mocks.captureAuthBootstrapFailure,
  captureAuthPersistenceFallback: mocks.captureAuthPersistenceFallback,
  captureException: mocks.captureException,
  captureErrorBoundaryException: mocks.captureErrorBoundaryException,
}));

import { ANALYTICS_CONSENT_KEY } from "@/domain/device/consent/analyticsConsent";
import {
  captureAuthBootstrapFailureLazy,
  captureAuthPersistenceFallbackLazy,
  captureErrorBoundaryExceptionLazy,
  captureExceptionLazy,
  denyAnalyticsConsentLazy,
  grantAnalyticsConsentLazy,
  syncAnalyticsIdentityLazy,
  trackPageViewLazy,
} from "./lazyTelemetry";

async function flush(): Promise<void> {
  await vi.dynamicImportSettled();
  await new Promise((r) => setTimeout(r, 0));
}

describe("lazyTelemetry", () => {
  it("forwards analytics identity", async () => {
    const user = { uid: "u1" } as Parameters<typeof syncAnalyticsIdentityLazy>[0];
    syncAnalyticsIdentityLazy(user);
    await flush();
    expect(mocks.syncAnalyticsIdentity).toHaveBeenCalledWith(user);
  });

  it("forwards client error calls with their arguments in order", async () => {
    const err = new Error("x");
    captureAuthBootstrapFailureLazy(err);
    captureAuthPersistenceFallbackLazy("memory", err);
    await vi.waitFor(() => {
      expect(mocks.captureAuthPersistenceFallback).toHaveBeenCalled();
    });
    expect(mocks.captureAuthBootstrapFailure).toHaveBeenCalledWith(err);
    expect(mocks.captureAuthPersistenceFallback).toHaveBeenCalledWith("memory", err);
  });

  it("swallows errors thrown by the underlying module", async () => {
    mocks.captureException.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      expect(() => captureExceptionLazy(new Error("x"))).not.toThrow();
      await flush();
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      process.off("unhandledRejection", unhandled);
    }
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("forwards page views and exceptions", async () => {
    const err = new Error("boom");
    trackPageViewLazy("/stats?x=1");
    captureExceptionLazy(err);
    captureErrorBoundaryExceptionLazy(err, "\n    at Boom");
    await vi.waitFor(() => {
      expect(mocks.captureErrorBoundaryException).toHaveBeenCalledWith(err, "\n    at Boom");
      expect(mocks.trackPageView).toHaveBeenCalledWith("/stats?x=1");
      expect(mocks.captureException).toHaveBeenCalledWith(err);
    });
  });

  it("persists consent synchronously before loading analytics", async () => {
    localStorage.clear();
    grantAnalyticsConsentLazy();
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
    denyAnalyticsConsentLazy();
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    await vi.waitFor(() => {
      expect(mocks.grantAnalyticsConsent).toHaveBeenCalledTimes(1);
      expect(mocks.denyAnalyticsConsent).toHaveBeenCalledTimes(1);
    });
    localStorage.clear();
  });
});
