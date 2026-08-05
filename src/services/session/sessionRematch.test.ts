import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSessionForRematch } from "./sessionRematch";

const callable = vi.hoisted(() => vi.fn(async () => ({ data: { ok: true } })));
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));
const getFirebaseFunctions = vi.hoisted(() => vi.fn(async () => ({})));
const getFirebaseAppCheck = vi.hoisted(() => vi.fn(() => ({ name: "app-check" })));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));
const getToken = vi.hoisted(() =>
  vi.fn(async () => ({ token: "app-check-token" })),
);
const captureAppCheckTokenFailure = vi.hoisted(() => vi.fn());

vi.mock("../core/firebase/firebase", () => ({
  getFirebaseFunctions,
  getFirebaseAppCheck,
  isFirebaseConfigured,
}));

vi.mock("../core/analytics/sentry", () => ({
  captureAppCheckTokenFailure,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("firebase/app-check", () => ({
  getToken,
}));

describe("resetSessionForRematch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFirebaseConfigured.mockReturnValue(true);
    getFirebaseAppCheck.mockReturnValue({ name: "app-check" });
    getToken.mockResolvedValue({ token: "app-check-token" });
  });

  it("primes App Check then calls resetSessionForRematch with the session id", async () => {
    await resetSessionForRematch("session-42");

    expect(getToken).toHaveBeenCalledOnce();
    expect(httpsCallable).toHaveBeenCalledWith({}, "resetSessionForRematch");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("still calls rematch when App Check is not configured", async () => {
    getFirebaseAppCheck.mockReturnValueOnce(null as unknown as { name: string });

    await resetSessionForRematch("session-42");

    expect(getToken).not.toHaveBeenCalled();
    expect(httpsCallable).toHaveBeenCalledWith({}, "resetSessionForRematch");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("continues when App Check token retrieval fails", async () => {
    const error = new Error("App Check unavailable");
    getToken.mockRejectedValueOnce(error);

    await resetSessionForRematch("session-42");

    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(error, {
      source: "resetSessionForRematch",
    });
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(resetSessionForRematch("session-42")).rejects.toThrow(
      "Firebase is not configured.",
    );
  });
});
