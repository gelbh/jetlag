import { afterEach, describe, expect, it, vi } from "vitest";

const addBreadcrumb = vi.hoisted(() => vi.fn());
const captureMessage = vi.hoisted(() => vi.fn());
const withScope = vi.hoisted(() =>
  vi.fn(
    (
      run: (scope: {
        setTag: ReturnType<typeof vi.fn>;
        setExtra: ReturnType<typeof vi.fn>;
      }) => void,
    ) => {
      run({ setTag: vi.fn(), setExtra: vi.fn() });
    },
  ),
);

const init = vi.hoisted(() => vi.fn());
const captureReactException = vi.hoisted(() => vi.fn());
const addIntegration = vi.hoisted(() => vi.fn());
const browserTracingIntegration = vi.hoisted(() => vi.fn(() => ({ name: "BrowserTracing" })));
const replayIntegration = vi.hoisted(() => vi.fn(() => ({ name: "Replay" })));
const getClientEnv = vi.hoisted(() => vi.fn((): Record<string, string> => ({})));
const idleCallbacks = vi.hoisted((): Array<() => void> => []);
const isolationScopeAddBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock("@sentry/react", () => ({
  addBreadcrumb,
  captureMessage,
  withScope,
  captureException: vi.fn(),
  captureReactException,
  init,
  addIntegration,
  browserTracingIntegration,
  replayIntegration,
  getIsolationScope: () => ({ addBreadcrumb: isolationScopeAddBreadcrumb }),
}));

vi.mock("../../../config/env", () => ({
  getClientEnv,
}));

vi.mock("@/domain/device/perf/scheduleAfterFirstPaint", () => ({
  scheduleIdleBootWork: vi.fn((callback: () => void) => {
    idleCallbacks.push(callback);
    return () => undefined;
  }),
}));

import {
  addRecoverableErrorBreadcrumb,
  captureErrorBoundaryException,
  initSentry,
  reportFirestoreListenPermissionDenied,
  reportJoinPermissionDenied,
  sentryRouteName,
} from "./sentry";

describe("initSentry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getClientEnv.mockReset();
    getClientEnv.mockReturnValue({});
    idleCallbacks.length = 0;
  });

  it("skips init and replay scheduling without a DSN", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("DEV", false);

    initSentry();

    expect(init).not.toHaveBeenCalled();
    expect(idleCallbacks).toHaveLength(0);
  });

  it("inits without replay, then adds replay once on idle", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("DEV", false);
    getClientEnv.mockReturnValue({ VITE_SENTRY_DSN: "https://key@example.invalid/1" });

    initSentry();

    expect(init).toHaveBeenCalledOnce();
    const options = init.mock.calls[0]?.[0] as {
      integrations: unknown[];
      replaysSessionSampleRate: number;
      replaysOnErrorSampleRate: number;
    };
    expect(options.integrations).toEqual([{ name: "BrowserTracing" }]);
    expect(replayIntegration).not.toHaveBeenCalled();
    expect(options.replaysOnErrorSampleRate).toBe(1.0);
    expect(options).toHaveProperty("replaysSessionSampleRate");
    expect(addIntegration).not.toHaveBeenCalled();
    expect(idleCallbacks).toHaveLength(1);

    idleCallbacks[0]?.();
    expect(addIntegration).toHaveBeenCalledOnce();
    expect(replayIntegration).toHaveBeenCalledExactlyOnceWith({
      maskAllText: true,
      blockAllMedia: true,
    });
    expect(addIntegration).toHaveBeenCalledWith({ name: "Replay" });

    initSentry();
    expect(idleCallbacks).toHaveLength(1);
  });

  // SDK 11 span streaming renamed every pageload "Pageload" and moved LCP/CLS off the
  // pageload (0 field pageloads with measurements.lcp on 0.17.1-1.0.x).
  it("keeps route-named pageloads with LCP/CLS/INP on the static trace lifecycle", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("DEV", false);
    getClientEnv.mockReturnValue({ VITE_SENTRY_DSN: "https://key@example.invalid/1" });
    browserTracingIntegration.mockClear();

    initSentry();

    const options = init.mock.lastCall?.[0] as { traceLifecycle?: string };
    expect(options.traceLifecycle).toBe("static");

    expect(browserTracingIntegration).toHaveBeenCalledOnce();
    const tracingOptions = (browserTracingIntegration.mock.calls[0] as unknown[])[0] as {
      instrumentPageLoad?: boolean;
      instrumentNavigation?: boolean;
      enableInp?: boolean;
      webVitals?: { ignore?: string[] };
      beforeStartSpan?: (options: { name: string; op?: string }) => { name: string; op?: string };
    };
    expect(tracingOptions.instrumentPageLoad).not.toBe(false);
    expect(tracingOptions.instrumentNavigation).not.toBe(false);
    expect(tracingOptions.enableInp).not.toBe(false);
    expect(tracingOptions.webVitals?.ignore ?? []).toEqual([]);

    const beforeStartSpan = tracingOptions.beforeStartSpan;
    expect(beforeStartSpan).toBeTypeOf("function");
    expect(beforeStartSpan?.({ name: "/join", op: "pageload" })).toEqual({
      name: "/join",
      op: "pageload",
    });
    expect(beforeStartSpan?.({ name: "/presets/abc123/edit", op: "navigation" })).toEqual({
      name: "/presets/:id/edit",
      op: "navigation",
    });
  });
});

describe("sentryRouteName", () => {
  it("keeps static routes and parameterizes id segments", () => {
    expect(sentryRouteName("/")).toBe("/");
    expect(sentryRouteName("/map")).toBe("/map");
    expect(sentryRouteName("/join?code=ABCD")).toBe("/join");
    expect(sentryRouteName("/presets/abc123/edit")).toBe("/presets/:id/edit");
    expect(sentryRouteName("/admin/incidents")).toBe("/admin/incidents");
    expect(sentryRouteName("/admin/incidents/inc_42")).toBe("/admin/incidents/:incidentId");
  });
});

describe("reportJoinPermissionDenied", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    addBreadcrumb.mockClear();
    captureMessage.mockClear();
    withScope.mockClear();
  });

  it("adds join breadcrumb without captureMessage for initial and retry", () => {
    vi.stubEnv("MODE", "production");

    reportJoinPermissionDenied("initial");
    reportJoinPermissionDenied("retry");

    expect(addBreadcrumb).toHaveBeenCalledTimes(2);
    expect(addBreadcrumb).toHaveBeenNthCalledWith(1, {
      category: "join",
      message: "Join permission denied",
      level: "warning",
      data: { op: "join", code: "permission-denied", phase: "initial" },
    });
    expect(addBreadcrumb).toHaveBeenNthCalledWith(2, {
      category: "join",
      message: "Join permission denied",
      level: "warning",
      data: { op: "join", code: "permission-denied", phase: "retry" },
    });
    expect(captureMessage).not.toHaveBeenCalled();
    expect(withScope).not.toHaveBeenCalled();
  });

  it("no-ops in test mode", () => {
    vi.stubEnv("MODE", "test");

    reportJoinPermissionDenied("initial");

    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });
});

describe("reportFirestoreListenPermissionDenied", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    addBreadcrumb.mockClear();
  });

  it("adds listen breadcrumb without captureMessage", () => {
    vi.stubEnv("MODE", "production");

    reportFirestoreListenPermissionDenied();

    expect(addBreadcrumb).toHaveBeenCalledExactlyOnceWith({
      category: "firestore",
      message: "Listen permission denied",
      level: "warning",
      data: { op: "listen", code: "permission-denied" },
    });
  });

  it("no-ops in test mode", () => {
    vi.stubEnv("MODE", "test");

    reportFirestoreListenPermissionDenied();

    expect(addBreadcrumb).not.toHaveBeenCalled();
  });
});

describe("addRecoverableErrorBreadcrumb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    addBreadcrumb.mockClear();
    isolationScopeAddBreadcrumb.mockClear();
  });

  it("writes to the isolation scope so it survives until initSentry", () => {
    vi.stubEnv("MODE", "production");
    window.history.replaceState(null, "", "/join");

    addRecoverableErrorBreadcrumb(
      new Error("x".repeat(400), { cause: new Error("text differs") }),
      "\n    at Home",
    );

    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(isolationScopeAddBreadcrumb).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        category: "react.recoverable",
        message: "x".repeat(300),
        level: "warning",
        timestamp: expect.any(Number),
        data: { pathname: "/join", componentStack: "\n    at Home" },
      }),
    );
  });

  it("keeps the hydration cause in the message", () => {
    vi.stubEnv("MODE", "production");

    addRecoverableErrorBreadcrumb(
      new Error("Hydration failed", { cause: new Error("text differs") }),
    );

    expect(isolationScopeAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Hydration failed (cause: text differs)",
      }),
    );
  });

  it("no-ops in test mode", () => {
    vi.stubEnv("MODE", "test");

    addRecoverableErrorBreadcrumb(new Error("x"));

    expect(isolationScopeAddBreadcrumb).not.toHaveBeenCalled();
  });
});

describe("captureErrorBoundaryException", () => {
  it("captures like Sentry.ErrorBoundary with the component stack", () => {
    const error = new Error("boom");
    captureErrorBoundaryException(error, "\n    at Boom");
    expect(captureReactException).toHaveBeenCalledWith(
      error,
      { componentStack: "\n    at Boom" },
      {
        mechanism: {
          handled: true,
          type: "auto.function.react.error_boundary",
        },
      },
    );
  });
});
