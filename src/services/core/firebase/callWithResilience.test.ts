import { FirebaseError } from "firebase/app";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/state/sessionStore";
import {
  callWithResilience,
  DEFAULT_CALLABLE_TIMEOUT_MS,
  isCallableError,
  NeedsConnectionError,
} from "./callWithResilience";

const callable = vi.hoisted(() => vi.fn());
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));
const getFirebaseFunctions = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("firebase/functions", () => ({ httpsCallable }));
vi.mock("./firebase", () => ({ getFirebaseFunctions }));
vi.mock("@/domain/device/network/backoff", () => ({
  fullJitterDelayMs: () => 0,
}));

function callableError(code: string): FirebaseError {
  return new FirebaseError(`functions/${code}`, code);
}

describe("callWithResilience", () => {
  let onLine: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    callable.mockReset();
    httpsCallable.mockClear();
    onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    useSessionStore.getState().setNetworkReachable(null);
  });

  afterEach(() => {
    onLine.mockRestore();
    useSessionStore.getState().setNetworkReachable(null);
  });

  it("throws NeedsConnectionError without calling when navigator is offline", async () => {
    onLine.mockReturnValue(false);

    await expect(callWithResilience("endSession", {})).rejects.toBeInstanceOf(NeedsConnectionError);
    expect(httpsCallable).not.toHaveBeenCalled();
    expect(callable).not.toHaveBeenCalled();
  });

  it("throws NeedsConnectionError when the reachability probe failed", async () => {
    useSessionStore.getState().setNetworkReachable(false);

    await expect(callWithResilience("endSession", {})).rejects.toThrow("Needs a connection");
    expect(callable).not.toHaveBeenCalled();
  });

  it("passes the capped timeout to the SDK", async () => {
    callable.mockResolvedValueOnce({ data: { ok: true } });

    await expect(callWithResilience("endSession", { sessionId: "s" })).resolves.toEqual({
      ok: true,
    });
    expect(httpsCallable).toHaveBeenCalledWith({}, "endSession", {
      timeout: DEFAULT_CALLABLE_TIMEOUT_MS,
    });
    expect(callable).toHaveBeenCalledWith({ sessionId: "s" });
  });

  it("retries unavailable with jitter when idempotent", async () => {
    callable
      .mockRejectedValueOnce(callableError("unavailable"))
      .mockRejectedValueOnce(callableError("unavailable"))
      .mockResolvedValueOnce({ data: "ok" });

    await expect(callWithResilience("endSession", {}, { idempotent: true })).resolves.toBe("ok");
    expect(callable).toHaveBeenCalledTimes(3);
  });

  it("gives up after maxAttempts and rethrows the last error", async () => {
    callable.mockRejectedValue(callableError("deadline-exceeded"));

    await expect(callWithResilience("endSession", {}, { idempotent: true })).rejects.toMatchObject({
      code: "functions/deadline-exceeded",
    });
    expect(callable).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-idempotent callables", async () => {
    callable.mockRejectedValue(callableError("unavailable"));

    await expect(callWithResilience("regenerateRolePasscode", {})).rejects.toMatchObject({
      code: "functions/unavailable",
    });
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("does not retry permission-denied even when idempotent", async () => {
    callable.mockRejectedValue(callableError("permission-denied"));

    await expect(callWithResilience("endSession", {}, { idempotent: true })).rejects.toMatchObject({
      code: "functions/permission-denied",
    });
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("stops retrying when the device goes offline during backoff", async () => {
    callable.mockImplementationOnce(async () => {
      onLine.mockReturnValue(false);
      throw callableError("unavailable");
    });

    await expect(callWithResilience("endSession", {}, { idempotent: true })).rejects.toBeInstanceOf(
      NeedsConnectionError,
    );
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("never retries non-idempotent callables even with maxAttempts", async () => {
    callable.mockRejectedValue(callableError("unavailable"));

    await expect(
      callWithResilience("requestRoleJoin", {}, { idempotent: false, maxAttempts: 3 }),
    ).rejects.toMatchObject({ code: "functions/unavailable" });
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("stops retrying once the total budget cannot fit another attempt", async () => {
    callable.mockRejectedValue(callableError("unavailable"));

    await expect(
      callWithResilience("endSession", {}, { idempotent: true, timeoutMs: 500, budgetMs: 500 }),
    ).rejects.toMatchObject({ code: "functions/unavailable" });
    expect(callable).toHaveBeenCalledTimes(1);
  });

  it("runs prepare after the offline gate, before the first attempt", async () => {
    const prepare = vi.fn(async () => {
      expect(callable).not.toHaveBeenCalled();
    });
    callable.mockResolvedValueOnce({ data: "ok" });

    await callWithResilience("resetSessionForRematch", {}, { prepare });
    expect(prepare).toHaveBeenCalledOnce();

    onLine.mockReturnValue(false);
    prepare.mockClear();
    await expect(
      callWithResilience("resetSessionForRematch", {}, { prepare }),
    ).rejects.toBeInstanceOf(NeedsConnectionError);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("recovers when a retry hits the already-applied precondition", async () => {
    callable
      .mockRejectedValueOnce(callableError("deadline-exceeded"))
      .mockRejectedValueOnce(
        new FirebaseError("functions/failed-precondition", "Join request is not pending."),
      );

    await expect(
      callWithResilience(
        "cancelRoleJoinRequest",
        {},
        {
          idempotent: true,
          recoverAfterRetry: (error) =>
            isCallableError(error, "failed-precondition", "Join request is not pending.")
              ? { ok: true }
              : undefined,
        },
      ),
    ).resolves.toEqual({ ok: true });
    expect(callable).toHaveBeenCalledTimes(2);
  });

  it("does not recover a first-attempt precondition error", async () => {
    const recoverAfterRetry = vi.fn(() => ({ ok: true }));
    callable.mockRejectedValueOnce(callableError("failed-precondition"));

    await expect(
      callWithResilience("cancelRoleJoinRequest", {}, { idempotent: true, recoverAfterRetry }),
    ).rejects.toMatchObject({ code: "functions/failed-precondition" });
    expect(recoverAfterRetry).not.toHaveBeenCalled();
  });

  it("retries functions/internal for idempotent calls", async () => {
    callable.mockRejectedValueOnce(callableError("internal")).mockResolvedValueOnce({ data: "ok" });

    await expect(callWithResilience("revealRolePasscode", {}, { idempotent: true })).resolves.toBe(
      "ok",
    );
    expect(callable).toHaveBeenCalledTimes(2);
  });
});
