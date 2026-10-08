import { afterEach, describe, expect, it, vi } from "vitest";

const addBreadcrumb = vi.hoisted(() => vi.fn());
const captureMessage = vi.hoisted(() => vi.fn());
const setUser = vi.hoisted(() => vi.fn());
const sentryCaptureException = vi.hoisted(() => vi.fn());
const posthogCaptureException = vi.hoisted(() => vi.fn());
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
const createSentryReactRouterIntegration = vi.hoisted(() =>
  vi.fn(() => ({ name: "ReactRouterTracing" })),
);
const replayIntegration = vi.hoisted(() => vi.fn(() => ({ name: "Replay" })));
const getClientEnv = vi.hoisted(() => vi.fn((): Record<string, string> => ({})));
const idleCallbacks = vi.hoisted((): Array<() => void> => []);
const isolationScopeAddBreadcrumb = vi.hoisted(() => vi.fn());
const scopeSetTransactionName = vi.hoisted(() => vi.fn());
const fetchTransport = vi.hoisted(() => vi.fn());
const offlineTransport = vi.hoisted(() => vi.fn());
const makeBrowserOfflineTransport = vi.hoisted(() => vi.fn(() => offlineTransport));

vi.mock("@sentry/react", () => ({
  addBreadcrumb,
  captureMessage,
  setUser,
  withScope,
  captureException: sentryCaptureException,
  captureReactException,
  init,
  addIntegration,
  replayIntegration,
  makeBrowserOfflineTransport,
  makeFetchTransport: fetchTransport,
  getIsolationScope: () => ({ addBreadcrumb: isolationScopeAddBreadcrumb }),
  getCurrentScope: () => ({ setTransactionName: scopeSetTransactionName }),
}));

vi.mock("posthog-js", () => ({
  default: {
    captureException: posthogCaptureException,
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    identify: vi.fn(),
    stopSessionRecording: vi.fn(),
  },
}));

vi.mock("./sentryReactRouter", () => ({
  createSentryReactRouterIntegration,
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

import { resetAnalyticsForTests } from "./analytics";
import {
  addRecoverableErrorBreadcrumb,
  captureErrorBoundaryException,
  captureException,
  initSentry,
  reportFirestoreListenPermissionDenied,
  reportJoinPermissionDenied,
  setTransactionName,
  syncSentryUser,
} from "./sentry";
import { CLIENT_SENTRY_DATA_COLLECTION } from "./sentryDataCollection";
import { CLIENT_SENTRY_IGNORE_SPANS } from "./sentryIgnoreSpans";

describe("CLIENT_SENTRY_IGNORE_SPANS", () => {
  it("includes a matcher that references proxy/overpass", () => {
    const serialized = JSON.stringify(CLIENT_SENTRY_IGNORE_SPANS, (_key, value: unknown) =>
      value instanceof RegExp ? value.source : value,
    );
    expect(serialized).toMatch(/proxy\/overpass/);
  });
});

function stubProdWithDsn(): void {
  vi.stubEnv("MODE", "production");
  vi.stubEnv("DEV", false);
  getClientEnv.mockReturnValue({ VITE_SENTRY_DSN: "https://key@example.invalid/1" });
}

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
    stubProdWithDsn();

    initSentry();

    expect(init).toHaveBeenCalledOnce();
    const options = init.mock.calls[0]?.[0] as {
      integrations: unknown[];
      replaysSessionSampleRate: number;
      replaysOnErrorSampleRate: number;
      dataCollection: unknown;
      tunnel: string;
      ignoreSpans: unknown;
    };
    expect(options.integrations).toEqual([{ name: "ReactRouterTracing" }]);
    expect(createSentryReactRouterIntegration).toHaveBeenCalledOnce();
    expect(replayIntegration).not.toHaveBeenCalled();
    expect(options.replaysOnErrorSampleRate).toBe(1.0);
    expect(options).toHaveProperty("replaysSessionSampleRate");
    expect(options.dataCollection).toBe(CLIENT_SENTRY_DATA_COLLECTION);
    expect(options.tunnel).toBe("/api/envelope-tunnel");
    expect(options.ignoreSpans).toBe(CLIENT_SENTRY_IGNORE_SPANS);
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

  it("wires the IndexedDB offline transport through the tunnel", () => {
    stubProdWithDsn();
    makeBrowserOfflineTransport.mockClear();

    initSentry();

    const options = init.mock.lastCall?.[0] as {
      tunnel?: string;
      transport?: unknown;
      transportOptions?: Record<string, unknown>;
    };
    expect(makeBrowserOfflineTransport).toHaveBeenCalledExactlyOnceWith(fetchTransport);
    expect(options.transport).toBe(offlineTransport);
    expect(options.transportOptions).toEqual({ maxQueueSize: 30, flushAtStartup: true });
    // The SDK builds the transport URL from `tunnel`, so queued envelopes still hit the worker.
    expect(options.tunnel).toBe("/api/envelope-tunnel");
  });

  // The SDK runs beforeSend before handing the envelope to the transport, so this is what
  // gets queued offline.
  it("keeps beforeSend scrubbing join codes and session ids", () => {
    stubProdWithDsn();

    initSentry();

    const options = init.mock.lastCall?.[0] as {
      beforeSend?: (event: Record<string, unknown>, hint: unknown) => unknown;
    };
    const scrubbed = options.beforeSend?.(
      { message: "Join ABCD failed", extra: { sessionId: "s-1" } },
      {},
    ) as { message: string; extra: Record<string, unknown> };
    expect(scrubbed.message).toBe("Join **** failed");
    expect(scrubbed.extra.sessionId).toBe("[redacted]");
  });

  // SDK 11's default span streaming names pageloads "Pageload" and drops LCP/CLS from them.
  it("keeps route-named pageloads with LCP/CLS/INP on the static trace lifecycle", () => {
    stubProdWithDsn();
    createSentryReactRouterIntegration.mockClear();

    initSentry();

    const options = init.mock.lastCall?.[0] as { traceLifecycle?: string };
    expect(options.traceLifecycle).toBe("static");
    expect(createSentryReactRouterIntegration).toHaveBeenCalledOnce();
  });
});

describe("setTransactionName", () => {
  it("names the scope with the parameterized route", () => {
    setTransactionName("/presets/abc123/edit");
    expect(scopeSetTransactionName).toHaveBeenCalledWith("/presets/:id/edit");
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

describe("syncSentryUser", () => {
  afterEach(() => {
    setUser.mockClear();
  });

  it("sets Sentry user id from firebase uid only", () => {
    syncSentryUser({ uid: "firebase-uid-1" });

    expect(setUser).toHaveBeenCalledExactlyOnceWith({ id: "firebase-uid-1" });
    const payload = setUser.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("username");
    expect(payload).not.toHaveProperty("uid");
  });

  it("clears Sentry user when identity is null", () => {
    syncSentryUser(null);

    expect(setUser).toHaveBeenCalledExactlyOnceWith(null);
  });
});

describe("captureException", () => {
  afterEach(() => {
    resetAnalyticsForTests();
    sentryCaptureException.mockClear();
    posthogCaptureException.mockClear();
  });

  it("dual-writes to Sentry and PostHog when core is inited", async () => {
    resetAnalyticsForTests({ initialized: true });
    const error = new Error("x");

    captureException(error);

    expect(sentryCaptureException).toHaveBeenCalledExactlyOnceWith(error);
    await vi.waitFor(() => {
      expect(posthogCaptureException).toHaveBeenCalledOnce();
      const passed = posthogCaptureException.mock.calls[0]?.[0] as Error;
      expect(passed).toBeInstanceOf(Error);
      expect(passed.message).toBe("x");
    });
  });

  it("soft-fails when PostHog core is not inited", async () => {
    resetAnalyticsForTests();
    const error = new Error("x");

    expect(() => captureException(error)).not.toThrow();
    expect(sentryCaptureException).toHaveBeenCalledExactlyOnceWith(error);
    await vi.dynamicImportSettled();
    await new Promise((r) => setTimeout(r, 0));
    expect(posthogCaptureException).not.toHaveBeenCalled();
  });
});
