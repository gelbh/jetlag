import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardBoardSelection } from "../../domain/game/leaderboardBoardPrefs";
import { useLeaderboardSelfEntry } from "./useLeaderboardSelfEntry";

const getLeaderboardSelfEntry = vi.hoisted(() => vi.fn());

vi.mock("../../services/firestore/firestoreLeaderboard", () => ({
  getLeaderboardSelfEntry,
}));

const selection: LeaderboardBoardSelection = {
  scope: "global",
  gameSize: "medium",
  role: "seeker",
  metric: "distance_traveled",
};

describe("useLeaderboardSelfEntry", () => {
  beforeEach(() => {
    getLeaderboardSelfEntry.mockReset();
  });

  it("loads entry for uid", async () => {
    getLeaderboardSelfEntry.mockResolvedValue({
      uid: "me",
      displayName: "Nova",
      value: 18.2,
      rank: 12,
    });

    const { result } = renderHook(() =>
      useLeaderboardSelfEntry(selection, "me"),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entry).toEqual({
      uid: "me",
      displayName: "Nova",
      value: 18.2,
      rank: 12,
    });
    expect(result.current.error).toBe(false);
    expect(getLeaderboardSelfEntry).toHaveBeenCalledWith(
      "global",
      "medium",
      "seeker",
      "distance_traveled",
      "me",
    );
  });

  it("sets error when fetch rejects", async () => {
    getLeaderboardSelfEntry.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useLeaderboardSelfEntry(selection, "me"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBe(true);
  });

  it("clears state when uid is missing", async () => {
    const { result } = renderHook(() =>
      useLeaderboardSelfEntry(selection, null),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBe(false);
    expect(getLeaderboardSelfEntry).not.toHaveBeenCalled();
  });

  it("clears entry when selection changes before the next fetch settles", async () => {
    getLeaderboardSelfEntry.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                uid: "me",
                displayName: "Nova",
                value: 18.2,
                rank: 12,
              }),
            20,
          );
        }),
    );

    const { result, rerender } = renderHook(
      ({ sel }) => useLeaderboardSelfEntry(sel, "me"),
      { initialProps: { sel: selection } },
    );

    await waitFor(() => {
      expect(result.current.entry?.rank).toBe(12);
    });

    getLeaderboardSelfEntry.mockImplementation(
      () =>
        new Promise(() => {
          /* pending */
        }),
    );

    rerender({
      sel: { ...selection, metric: "rounds_won" as const },
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.entry).toBeNull();
  });

  it("skips fetch when skip is true", async () => {
    const { result } = renderHook(() =>
      useLeaderboardSelfEntry(selection, "me", true),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.entry).toBeNull();
    expect(getLeaderboardSelfEntry).not.toHaveBeenCalled();
  });
});
