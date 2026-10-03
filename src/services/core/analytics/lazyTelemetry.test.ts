import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncAnalyticsIdentity: vi.fn(),
  trackPageView: vi.fn(),
  grantAnalyticsConsent: vi.fn(),
  denyAnalyticsConsent: vi.fn(),
  captureException: vi.fn(),
  reportSlowRouteTransition: vi.fn(),
  setTransactionName: vi.fn(),
  captureErrorBoundaryException: vi.fn(),
  setBootstrapTag: vi.fn(),
  captureAuthBootstrapFailure: vi.fn(),
  captureAuthPersistenceFallback: vi.fn(),
  addRecoverableErrorBreadcrumb: vi.fn(),
}));

vi.mock("./analytics", () => ({
  syncAnalyticsIdentity: mocks.syncAnalyticsIdentity,
  trackPageView: mocks.trackPageView,
  grantAnalyticsConsent: mocks.grantAnalyticsConsent,
  denyAnalyticsConsent: mocks.denyAnalyticsConsent,
}));
vi.mock("./sentry", () => ({
  setBootstrapTag: mocks.setBootstrapTag,
  captureAuthBootstrapFailure: mocks.captureAuthBootstrapFailure,
  captureAuthPersistenceFallback: mocks.captureAuthPersistenceFallback,
  captureException: mocks.captureException,
  reportSlowRouteTransition: mocks.reportSlowRouteTransition,
  setTransactionName: mocks.setTransactionName,
  captureErrorBoundaryException: mocks.captureErrorBoundaryException,
  addRecoverableErrorBreadcrumb: mocks.addRecoverableErrorBreadcrumb,
}));

import { ANALYTICS_CONSENT_KEY } from "@/domain/device/consent/analyticsConsent";
import {
  addRecoverableErrorBreadcrumbLazy,
  captureAuthBootstrapFailureLazy,
  captureAuthPersistenceFallbackLazy,
  captureErrorBoundaryExceptionLazy,
  captureExceptionLazy,
  denyAnalyticsConsentLazy,
  grantAnalyticsConsentLazy,
  reportSlowRouteTransitionLazy,
  setBootstrapTagLazy,
  setTransactionNameLazy,
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
    expect(mocks.setBootstrapTag.mock.calls).toEqual([["auth_start"], ["auth_ready"]]);
    expect(mocks.captureAuthBootstrapFailure).toHaveBeenCalledWith(err);
    expect(mocks.captureAuthPersistenceFallback).toHaveBeenCalledWith("memory", err);
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

  it("forwards page views, exceptions, slow-route reports and transaction names", async () => {
    const err = new Error("boom");
    const details = {
      preload_ms: 1,
      ready_wait_ms: 2,
      total_ms: 3,
      target_path: "/map",
      final_path: "/map",
      readiness_kind: "play-area",
      warm_chunk: false,
      warm_ready: false,
    };
    trackPageViewLazy("/stats?x=1");
    captureExceptionLazy(err);
    reportSlowRouteTransitionLazy(details);
    setTransactionNameLazy("/stats");
    captureErrorBoundaryExceptionLazy(err, "\n    at Boom");
    await vi.waitFor(() => {
      expect(mocks.captureErrorBoundaryException).toHaveBeenCalledWith(err, "\n    at Boom");
      expect(mocks.trackPageView).toHaveBeenCalledWith("/stats?x=1");
      expect(mocks.captureException).toHaveBeenCalledWith(err);
      expect(mocks.reportSlowRouteTransition).toHaveBeenCalledWith(details);
      expect(mocks.setTransactionName).toHaveBeenCalledWith("/stats");
    });
  });

  it("forwards recoverable-error breadcrumbs without throwing", async () => {
    const err = new Error("Hydration failed");
    expect(() => addRecoverableErrorBreadcrumbLazy(err, "\n    at Home")).not.toThrow();
    await vi.waitFor(() => {
      expect(mocks.addRecoverableErrorBreadcrumb).toHaveBeenCalledWith(err, "\n    at Home");
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
