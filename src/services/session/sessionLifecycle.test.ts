import { beforeEach, describe, expect, it, vi } from "vitest";
import { endSession, leaveHostSession, repairGhostHost } from "./sessionLifecycle";

const callable = vi.hoisted(() =>
  vi.fn(async () => ({ data: { action: "ended" as const } })),
);
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));
const getFirebaseFunctions = vi.hoisted(() => vi.fn(async () => ({})));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));
const trackSessionEnded = vi.hoisted(() => vi.fn());

vi.mock("../core/firebase/firebase", () => ({
  getFirebaseFunctions,
  isFirebaseConfigured,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("../core/analytics/analytics", () => ({
  trackSessionEnded,
}));

describe("sessionLifecycle", () => {
  beforeEach(() => {
    trackSessionEnded.mockClear();
    callable.mockClear();
    httpsCallable.mockClear();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("calls leaveHostSession with the session id", async () => {
    await leaveHostSession("session-42");

    expect(httpsCallable).toHaveBeenCalledWith({}, "leaveHostSession");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
    expect(trackSessionEnded).not.toHaveBeenCalled();
  });

  it("calls repairGhostHost with the session id", async () => {
    callable.mockResolvedValueOnce({
      data: { action: "repaired", newHostUid: "seeker-1" },
    } as never);
    await expect(repairGhostHost("session-42")).resolves.toEqual({
      action: "repaired",
      newHostUid: "seeker-1",
    });

    expect(httpsCallable).toHaveBeenCalledWith({}, "repairGhostHost");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("returns noop from repairGhostHost when host is intact", async () => {
    callable.mockResolvedValueOnce({
      data: { action: "noop", hostUid: "host-1" },
    } as never);
    await expect(repairGhostHost("session-42")).resolves.toEqual({
      action: "noop",
      hostUid: "host-1",
    });
  });

  it("calls endSession and tracks host_end once", async () => {
    callable.mockResolvedValueOnce({ data: { ok: true } } as never);
    await endSession("session-42");

    expect(httpsCallable).toHaveBeenCalledWith({}, "endSession");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
    expect(trackSessionEnded).toHaveBeenCalledOnce();
    expect(trackSessionEnded).toHaveBeenCalledWith("host_end");
  });

  it("does not track when endSession callable fails", async () => {
    callable.mockRejectedValueOnce(new Error("network"));
    await expect(endSession("session-42")).rejects.toThrow("network");
    expect(trackSessionEnded).not.toHaveBeenCalled();
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(leaveHostSession("session-42")).rejects.toThrow(
      "Firebase is not configured.",
    );
  });
});
