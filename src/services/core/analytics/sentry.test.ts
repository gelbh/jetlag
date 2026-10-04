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
const scopeSetTransactionName = vi.hoisted(() => vi.fn());
const fetchTransport = vi.hoisted(() => vi.fn());
const offlineTransport = vi.hoisted(() => vi.fn());
const makeBrowserOfflineTransport = vi.hoisted(() => vi.fn(() => offlineTransport));

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
  makeBrowserOfflineTransport,
  makeFetchTransport: fetchTransport,
  getIsolationScope: () => ({ addBreadcrumb: isolationScopeAddBreadcrumb }),
  getCurrentScope: () => ({ setTransactionName: scopeSetTransactionName }),
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
  setTransactionName,
} from "./sentry";

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

  it("buffers envelopes offline through the tunnel with beforeSend scrubbing intact", () => {
    stubProdWithDsn();
    makeBrowserOfflineTransport.mockClear();

    initSentry();

    const options = init.mock.lastCall?.[0] as {
      tunnel?: string;
      transport?: unknown;
      transportOptions?: Record<string, unknown>;
      beforeSend?: (event: Record<string, unknown>, hint: unknown) => unknown;
    };
    expect(makeBrowserOfflineTransport).toHaveBeenCalledExactlyOnceWith(fetchTransport);
    expect(options.transport).toBe(offlineTransport);
    expect(options.transportOptions).toEqual({ maxQueueSize: 30, flushAtStartup: true });
    // The SDK builds the transport URL from `tunnel`, so queued envelopes still hit the worker.
    expect(options.tunnel).toBe("/api/sentry-tunnel");

    // Queued events are already scrubbed: beforeSend runs before the transport sees them.
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
    browserTracingIntegration.mockClear();

    initSentry();

    const options = init.mock.lastCall?.[0] as { traceLifecycle?: string };
    expect(options.traceLifecycle).toBe("static");

    expect(browserTracingIntegration).toHaveBeenCalledOnce();
    const tracingOptions = (browserTracingIntegration.mock.calls[0] as unknown[])[0] as Record<
      string,
      unknown
    > & {
      beforeStartSpan?: (options: { name: string; op?: string }) => { name: string; op?: string };
    };
    // SDK defaults keep pageload/navigation spans, LCP/CLS on the pageload and INP spans.
    for (const key of [
      "instrumentPageLoad",
      "instrumentNavigation",
      "enableInp",
      "webVitals",
      "idleTimeout",
      "finalTimeout",
    ]) {
      expect(tracingOptions).not.toHaveProperty(key);
    }

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
