import { describe, expect, it, vi } from "vitest";
import { endSession, leaveHostSession } from "./sessionLifecycle";

const callable = vi.hoisted(() =>
  vi.fn(async () => ({ data: { action: "ended" as const } })),
);
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));
const getFirebaseFunctions = vi.hoisted(() => vi.fn(async () => ({})));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("../core/firebase", () => ({
  getFirebaseFunctions,
  isFirebaseConfigured,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

describe("sessionLifecycle", () => {
  it("calls leaveHostSession with the session id", async () => {
    await leaveHostSession("session-42");

    expect(httpsCallable).toHaveBeenCalledWith({}, "leaveHostSession");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("calls endSession with the session id", async () => {
    callable.mockResolvedValueOnce({ data: { ok: true } } as never);
    await endSession("session-42");

    expect(httpsCallable).toHaveBeenCalledWith({}, "endSession");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(leaveHostSession("session-42")).rejects.toThrow(
      "Firebase is not configured.",
    );
  });
});
