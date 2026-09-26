import { beforeEach, describe, expect, it } from "vitest";
import {
  LEADERBOARD_MOCK_SELF_UID,
  LEADERBOARD_MOCK_STORAGE_KEY,
  getLeaderboardPlayerSheetProfile,
  isLeaderboardMockEnabled,
  mockListLeaderboardBoard,
} from "./leaderboardMock";

describe("leaderboardMock", () => {
  beforeEach(() => {
    localStorage.setItem(LEADERBOARD_MOCK_STORAGE_KEY, "1");
  });

  it("reports mock enabled from storage", () => {
    expect(isLeaderboardMockEnabled()).toBe(true);
    localStorage.removeItem(LEADERBOARD_MOCK_STORAGE_KEY);
    expect(isLeaderboardMockEnabled()).toBe(false);
  });

  it("ranks global boards and includes the mock self uid", async () => {
    const entries = await mockListLeaderboardBoard({
      scope: "global",
      gameSize: "medium",
      role: "seeker",
      metric: "distance_traveled",
    });
    expect(entries.length).toBeGreaterThan(8);
    expect(entries[0]?.rank).toBe(1);
    expect(entries.some((entry) => entry.uid === LEADERBOARD_MOCK_SELF_UID)).toBe(
      true,
    );
  });

  it("filters friends scope to friends-only players", async () => {
    const entries = await mockListLeaderboardBoard({
      scope: "friends",
      gameSize: "medium",
      role: "seeker",
      metric: "wins",
    });
    expect(entries.length).toBeLessThanOrEqual(5);
    expect(entries.every((entry) => entry.rank >= 1)).toBe(true);
  });

  it("exposes sheet profile for seeded players", () => {
    const profile = getLeaderboardPlayerSheetProfile("mock-lb-1");
    expect(profile.wins).toBe(19);
    expect(profile.lastPlayedLabel).toContain("Dublin");
  });
});
