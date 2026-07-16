import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseLeaderboardEntry,
  subscribeLeaderboardBoard,
} from "./firestoreLeaderboard";

const onSnapshot = vi.hoisted(() => vi.fn());
const orderBy = vi.hoisted(() => vi.fn(() => ({})));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("../core/firebase", () => ({
  getFirestoreDb: () => ({}),
  isFirebaseConfigured,
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  limit: vi.fn((n: number) => n),
  onSnapshot,
  orderBy,
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
  beforeEach(() => {
    onSnapshot.mockReset();
    orderBy.mockClear();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("maps snapshot docs with contiguous ranks after skipping invalids", () => {
    onSnapshot.mockImplementation((_query, onNext) => {
      onNext({
        docs: [
          {
            id: "u1",
            data: () => ({ uid: "u1", username: "alice", value: 12 }),
          },
          {
            id: "bad",
            data: () => ({ uid: "bad", username: "x", value: "nope" }),
          },
          {
            id: "u2",
            data: () => ({ uid: "u2", username: "bob", value: 8 }),
          },
        ],
      });
      return () => undefined;
    });

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
      { uid: "u2", displayName: "bob", value: 8, rank: 2 },
    ]);
    expect(orderBy).toHaveBeenCalledWith("value", "desc");
    expect(onError).not.toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
  });

  it("orders avg_answer_time ascending", () => {
    onSnapshot.mockImplementation(() => () => undefined);
    subscribeLeaderboardBoard(
      "global",
      "medium",
      "seeker",
      "avg_answer_time",
      vi.fn(),
      vi.fn(),
    );
    expect(orderBy).toHaveBeenCalledWith("value", "asc");
  });

  it("returns empty immediately when Firebase is not configured", () => {
    isFirebaseConfigured.mockReturnValue(false);
    const onChange = vi.fn();
    const unsub = subscribeLeaderboardBoard(
      "global",
      "medium",
      "seeker",
      "wins",
      onChange,
      vi.fn(),
    );
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
  });

  it("forwards snapshot errors", () => {
    const boom = new Error("permission-denied");
    onSnapshot.mockImplementation((_query, _onNext, onError) => {
      onError(boom);
      return () => undefined;
    });
    const onError = vi.fn();
    subscribeLeaderboardBoard(
      "global",
      "medium",
      "seeker",
      "wins",
      vi.fn(),
      onError,
    );
    expect(onError).toHaveBeenCalledWith(boom);
  });
});
