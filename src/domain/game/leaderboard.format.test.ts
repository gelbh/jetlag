import { describe, expect, it } from "vitest";
import { formatLeaderboardValue, leaderboardEntryLabel } from "./leaderboard";

describe("formatLeaderboardValue", () => {
  it("formats meters and kilometers", () => {
    expect(formatLeaderboardValue("distance_traveled", 420)).toBe("420 m");
    expect(formatLeaderboardValue("max_from_start", 1500)).toBe("1.5 km");
  });

  it("formats durations from milliseconds", () => {
    expect(formatLeaderboardValue("round_duration", 125_000)).toBe("2:05");
    expect(formatLeaderboardValue("phase_time", 3_661_000)).toBe("1:01:01");
  });

  it("formats counts", () => {
    expect(formatLeaderboardValue("wins", 3)).toBe("3");
    expect(formatLeaderboardValue("questions", 12)).toBe("12");
  });
});

describe("leaderboardEntryLabel", () => {
  it("falls back when blank", () => {
    expect(
      leaderboardEntryLabel({
        uid: "a",
        displayName: "  ",
        value: 1,
        rank: 1,
      }),
    ).toBe("Player");
  });
});
