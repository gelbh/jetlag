import { describe, expect, it, vi } from "vitest";
import { resetSessionForRematch } from "./sessionRematch";

const callable = vi.hoisted(() => vi.fn(async () => ({ data: { ok: true } })));
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

describe("resetSessionForRematch", () => {
  it("calls the resetSessionForRematch callable with the session id", async () => {
    await resetSessionForRematch("session-42");

    expect(httpsCallable).toHaveBeenCalledWith(
      {},
      "resetSessionForRematch",
    );
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-42" });
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(resetSessionForRematch("session-42")).rejects.toThrow(
      "Firebase is not configured.",
    );
  });
});
