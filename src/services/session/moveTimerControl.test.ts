import { beforeEach, describe, expect, it, vi } from "vitest";
import { controlSessionTimerForMove } from "./moveTimerControl";

const callable = vi.hoisted(() => vi.fn());
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("../core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseFunctions: async () => ({}),
}));

describe("controlSessionTimerForMove", () => {
  beforeEach(() => {
    httpsCallable.mockClear();
    callable.mockReset();
  });

  it("invokes the pause callable", async () => {
    callable.mockResolvedValueOnce({
      data: { ok: true, action: "pause", noop: false },
    });

    await expect(
      controlSessionTimerForMove("sess-1", "pause"),
    ).resolves.toEqual({ ok: true, action: "pause", noop: false });

    expect(httpsCallable).toHaveBeenCalledWith({}, "controlSessionTimerForMove");
    expect(callable).toHaveBeenCalledWith({
      sessionId: "sess-1",
      action: "pause",
    });
  });

  it("invokes the resume callable", async () => {
    callable.mockResolvedValueOnce({
      data: { ok: true, action: "resume", noop: false },
    });

    await expect(
      controlSessionTimerForMove("sess-1", "resume"),
    ).resolves.toEqual({ ok: true, action: "resume", noop: false });

    expect(callable).toHaveBeenCalledWith({
      sessionId: "sess-1",
      action: "resume",
    });
  });
});
