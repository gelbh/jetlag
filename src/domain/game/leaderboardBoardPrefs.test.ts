import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LEADERBOARD_BOARD,
  loadLeaderboardBoardPrefs,
  saveLeaderboardBoardPrefs,
} from "./leaderboardBoardPrefs";

describe("leaderboardBoardPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when empty", () => {
    expect(loadLeaderboardBoardPrefs()).toEqual(DEFAULT_LEADERBOARD_BOARD);
  });

  it("round-trips a valid selection", () => {
    saveLeaderboardBoardPrefs({
      scope: "friends",
      gameSize: "large",
      role: "hider",
      metric: "wins",
    });
    expect(loadLeaderboardBoardPrefs()).toEqual({
      scope: "friends",
      gameSize: "large",
      role: "hider",
      metric: "wins",
    });
  });

  it("falls back to defaults on corrupt JSON", () => {
    localStorage.setItem("jl.leaderboard.board", "{not-json");
    expect(loadLeaderboardBoardPrefs()).toEqual(DEFAULT_LEADERBOARD_BOARD);
  });
});
