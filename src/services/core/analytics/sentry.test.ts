import { afterEach, describe, expect, it, vi } from "vitest";

const posthogCaptureException = vi.hoisted(() => vi.fn());
const posthogCapture = vi.hoisted(() => vi.fn());

vi.mock("posthog-js", () => ({
  default: {
    captureException: posthogCaptureException,
    capture: posthogCapture,
    init: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    identify: vi.fn(),
    stopSessionRecording: vi.fn(),
    startSessionRecording: vi.fn(),
  },
}));

import { resetAnalyticsForTests } from "./analytics";
import {
  addAppResumeBreadcrumb,
  addIdbDeleteFailureBreadcrumb,
  addPhotoUploadBreadcrumb,
  addPwaStoragePressureBreadcrumb,
  addRecoverableErrorBreadcrumb,
  addWriteRejectedBreadcrumb,
  captureAppCheckTokenFailure,
  captureAuthBootstrapFailure,
  captureAuthPersistenceFallback,
  captureErrorBoundaryException,
  captureException,
  capturePendingResolveFailure,
  capturePhotoUploadFailure,
  captureResumeShellUnresponsive,
  reportFirestoreListenPermissionDenied,
  reportJoinPermissionDenied,
  reportSlowRouteTransition,
  setBootstrapTag,
  setTransactionName,
  syncSentryUser,
} from "./sentry";

describe("client facade module graph", () => {
  it("does not import the browser Sentry package from the facade source", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const banned = `@${"sentry/react"}`;
    const src = await fs.readFile(
      path.join(process.cwd(), "src/services/core/analytics/sentry.ts"),
      "utf8",
    );
    expect(src.includes(banned)).toBe(false);
  });
});

describe("no-op breadcrumbs and tracing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    posthogCapture.mockClear();
    posthogCaptureException.mockClear();
  });

  it("breadcrumb-only helpers do not throw or call PostHog product capture", () => {
    vi.stubEnv("MODE", "production");

    expect(() => reportJoinPermissionDenied("initial")).not.toThrow();
    expect(() => reportJoinPermissionDenied("retry")).not.toThrow();
    expect(() => reportFirestoreListenPermissionDenied()).not.toThrow();
    expect(() => addPhotoUploadBreadcrumb({ stage: "compress" })).not.toThrow();
    expect(() =>
      addAppResumeBreadcrumb({
        pathname: "/",
        backgroundMs: 1000,
        standalone: false,
        iosStandalone: false,
      }),
    ).not.toThrow();
    expect(() =>
      addPwaStoragePressureBreadcrumb({
        usage: 1,
        quota: 2,
        usageDetails: {},
      } as never),
    ).not.toThrow();
    expect(() => addWriteRejectedBreadcrumb("write", new Error("denied"))).not.toThrow();
    expect(() => addIdbDeleteFailureBreadcrumb(new Error("idb"))).not.toThrow();
    expect(() => addRecoverableErrorBreadcrumb(new Error("hydrate"))).not.toThrow();
    expect(() => setBootstrapTag("auth_start")).not.toThrow();
    expect(() => setTransactionName("/presets/abc123/edit")).not.toThrow();
    expect(() => syncSentryUser({ uid: "firebase-uid-1" })).not.toThrow();
    expect(() => syncSentryUser(null)).not.toThrow();
    expect(() =>
      reportSlowRouteTransition({
        preload_ms: 100,
        ready_wait_ms: 100,
        total_ms: 3000,
        target_path: "/home",
        final_path: "/home",
        readiness_kind: "idle",
        warm_chunk: false,
        warm_ready: false,
      }),
    ).not.toThrow();
    expect(() =>
      captureAppCheckTokenFailure(new Error("soft"), { soft: true, source: "probe" }),
    ).not.toThrow();

    expect(posthogCapture).not.toHaveBeenCalled();
    expect(posthogCaptureException).not.toHaveBeenCalled();
  });
});

describe("tagged captures", () => {
  afterEach(() => {
    resetAnalyticsForTests();
    posthogCaptureException.mockClear();
  });

  it("capturePhotoUploadFailure forwards stage as scrubbed properties", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("upload failed");

    capturePhotoUploadFailure(error, "storage", { sessionCode: "ABCD" });

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    const [passed, props] = posthogCaptureException.mock.calls[0] ?? [];
    expect(passed).toBeInstanceOf(Error);
    expect(props).toMatchObject({ photo_upload: "storage" });
    expect(JSON.stringify(props)).not.toMatch(/ABCD/);
  });

  it("capturePendingResolveFailure forwards tool tags", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("resolve failed");

    capturePendingResolveFailure(error, {
      toolType: "radar",
      pendingQuestionId: "q-1",
    });

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    expect(posthogCaptureException.mock.calls[0]?.[1]).toMatchObject({
      pending_resolve_failed: "true",
      toolType: "radar",
      pendingQuestionId: "q-1",
    });
  });

  it("captureAuthBootstrapFailure tags bootstrap phase", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("auth boom");

    captureAuthBootstrapFailure(error);

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    expect(posthogCaptureException.mock.calls[0]?.[1]).toMatchObject({
      bootstrap_phase: "auth_failed",
    });
  });

  it("captureAuthPersistenceFallback captures with mode tag", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("persist");

    captureAuthPersistenceFallback("memory", error);

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    expect(posthogCaptureException.mock.calls[0]?.[1]).toMatchObject({
      auth_persistence: "memory",
    });
  });

  it("captureAppCheckTokenFailure hard path captures with extras", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("token");

    captureAppCheckTokenFailure(error, { source: "probe", reason: "timeout" });

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    expect(posthogCaptureException.mock.calls[0]?.[1]).toMatchObject({
      app_check_token: "failed",
      source: "probe",
      reason: "timeout",
    });
  });

  it("captureErrorBoundaryException forwards componentStack", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("boom");

    captureErrorBoundaryException(error, "\n    at Boom");

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    expect(posthogCaptureException.mock.calls[0]?.[1]).toMatchObject({
      componentStack: "\n    at Boom",
    });
  });

  it("captureResumeShellUnresponsive captures with resume context", async () => {
    resetAnalyticsForTests({ initialized: true });

    captureResumeShellUnresponsive({
      pathname: "/home",
      backgroundMs: 5000,
      standalone: true,
      iosStandalone: false,
      adminRoute: true,
    });

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    const [passed, props] = posthogCaptureException.mock.calls[0] ?? [];
    expect(passed).toBeInstanceOf(Error);
    expect(props).toMatchObject({
      resume_watchdog: "unresponsive",
      pathname: "/home",
      backgroundMs: 5000,
      standalone: true,
      ios_standalone: false,
      admin_route: true,
    });
  });
});

describe("captureException", () => {
  afterEach(() => {
    resetAnalyticsForTests();
    posthogCaptureException.mockClear();
  });

  it("writes only to PostHog when core is inited", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("x");

    captureException(error);

    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
    });
    const passed = posthogCaptureException.mock.calls[0]?.[0] as Error;
    expect(passed).toBeInstanceOf(Error);
    expect(passed.message).toBe("x");
  });

  it("soft-fails when PostHog core is not inited", async () => {
    resetAnalyticsForTests();
    expect(() => captureException(new Error("x"))).not.toThrow();
    await vi.dynamicImportSettled();
    expect(posthogCaptureException).not.toHaveBeenCalled();
  });
});
