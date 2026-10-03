import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueMoveTimerIntent } from "./sessionIntents";

const setDoc = vi.hoisted(() => vi.fn());
const commitWrite = vi.hoisted(() =>
  vi.fn((_label: string, run: () => Promise<void>) => ({ acknowledged: run() })),
);

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  doc: vi.fn((parent: { path: string }) => ({ id: "intent-1", path: `${parent.path}/intent-1` })),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
  setDoc,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({}),
}));

vi.mock("@/services/core/time/serverClock", () => ({
  serverNow: () => 1_700_000_000_000.4,
}));

vi.mock("@/services/firestore/commitWrite", () => ({ commitWrite }));

describe("enqueueMoveTimerIntent", () => {
  beforeEach(() => {
    setDoc.mockReset();
    commitWrite.mockClear();
  });

  it("writes a move intent under the session through commitWrite", async () => {
    setDoc.mockResolvedValueOnce(undefined);

    const { intentId, acknowledged } = enqueueMoveTimerIntent("sess-1", "hider-1", "pause");

    expect(intentId).toBe("intent-1");
    expect(commitWrite).toHaveBeenCalledWith("move.intent", expect.any(Function));
    expect(setDoc).toHaveBeenCalledWith(
      { id: "intent-1", path: "sessions/sess-1/intents/intent-1" },
      {
        type: "moveTimer",
        action: "pause",
        uid: "hider-1",
        requestedAtMs: 1_700_000_000_000,
        createdAt: "SERVER_TS",
      },
    );
    await expect(acknowledged).resolves.toBeUndefined();
  });
});
