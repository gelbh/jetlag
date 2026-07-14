import { describe, expect, it, vi } from "vitest";
import { subscribeToGameResult } from "./firestoreGameResult";

const onSnapshot = vi.hoisted(() =>
  vi.fn((_ref: unknown, onNext: (snapshot: { exists: () => boolean; id: string; data: () => Record<string, unknown> }) => void) => {
    onNext({
      exists: () => true,
      id: "result-1",
      data: () => ({
        roundNumber: 0,
        gameSize: "medium",
        outcome: "found",
        endedAt: "2026-05-14T02:00:00.000Z",
        durationMs: 1000,
        hidingPhaseMs: 0,
        seekPhaseMs: 1000,
        seekTimeMs: 1000,
        players: [],
      }),
    });
    return vi.fn();
  }),
);

vi.mock("../core/firebase", () => ({
  getFirestoreDb: vi.fn(() => ({})),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot,
}));

describe("subscribeToGameResult", () => {
  it("deserializes snapshot data for subscribers", () => {
    const onChange = vi.fn();
    subscribeToGameResult("session-1", "result-1", onChange, vi.fn());

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        outcome: "found",
        durationMs: 1000,
      }),
    );
  });
});
