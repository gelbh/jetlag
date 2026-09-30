import { afterEach, describe, expect, it, vi } from "vitest";

const addBreadcrumb = vi.hoisted(() => vi.fn());
const captureMessage = vi.hoisted(() => vi.fn());
const withScope = vi.hoisted(() =>
  vi.fn((run: (scope: { setTag: ReturnType<typeof vi.fn>; setExtra: ReturnType<typeof vi.fn> }) => void) => {
    run({ setTag: vi.fn(), setExtra: vi.fn() });
  }),
);

const captureReactException = vi.hoisted(() => vi.fn());

vi.mock("@sentry/react", () => ({
  addBreadcrumb,
  captureMessage,
  withScope,
  captureException: vi.fn(),
  captureReactException,
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

vi.mock("../../../config/env", () => ({
  getClientEnv: vi.fn(() => ({})),
}));

import {
  captureErrorBoundaryException,
  reportJoinPermissionDenied,
  reportFirestoreListenPermissionDenied,
} from "./sentry";

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
