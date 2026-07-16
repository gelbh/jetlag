import { describe, expect, it, vi } from "vitest";
import {
  parseLeaderboardEntry,
  subscribeLeaderboardBoard,
} from "./firestoreLeaderboard";

const onSnapshot = vi.hoisted(() =>
  vi.fn((_query, onNext) => {
    onNext({
      docs: [
        {
          id: "u1",
          data: () => ({ uid: "u1", username: "alice", value: 12, rank: 1 }),
        },
        {
          id: "bad",
          data: () => ({ uid: "bad", username: "x", value: "nope" }),
        },
      ],
    });
    return () => undefined;
  }),
);

vi.mock("../core/firebase", () => ({
  getFirestoreDb: () => ({}),
  isFirebaseConfigured: () => true,
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  limit: vi.fn((n: number) => n),
  onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
}));

describe("parseLeaderboardEntry", () => {
  it("parses finite numeric values and prefers username", () => {
    expect(
      parseLeaderboardEntry(
        "doc",
        { uid: "u1", username: "Alice", value: 3.5, rank: 2 },
        0,
      ),
    ).toEqual({
      uid: "u1",
      displayName: "Alice",
      value: 3.5,
      rank: 2,
    });
  });

  it("rejects non-number and non-finite values", () => {
    expect(
      parseLeaderboardEntry("doc", { uid: "u1", value: "0" }, 0),
    ).toBeNull();
    expect(
      parseLeaderboardEntry("doc", { uid: "u1", value: Number.NaN }, 0),
    ).toBeNull();
    expect(
      parseLeaderboardEntry("doc", { uid: "u1", value: null }, 0),
    ).toBeNull();
  });

  it("falls back to doc id and index rank", () => {
    expect(parseLeaderboardEntry("u9", { value: 1 }, 4)).toEqual({
      uid: "u9",
      displayName: "Player",
      value: 1,
      rank: 5,
    });
  });
});

describe("subscribeLeaderboardBoard", () => {
  it("maps snapshot docs and skips invalid values", () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const unsub = subscribeLeaderboardBoard(
      "global",
      "medium",
      "seeker",
      "wins",
      onChange,
      onError,
    );
    expect(onChange).toHaveBeenCalledWith([
      { uid: "u1", displayName: "alice", value: 12, rank: 1 },
    ]);
    expect(onError).not.toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
  });
});
