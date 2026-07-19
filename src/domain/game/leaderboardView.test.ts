import { describe, expect, it } from "vitest";
import type { LeaderboardEntry } from "./leaderboard";
import {
  leaderboardBoardSummaryLabel,
  resolveSelfFooterMode,
  splitLeadPack,
} from "./leaderboardView";

const entry = (
  uid: string,
  rank: number,
  value = 1,
): LeaderboardEntry => ({
  uid,
  displayName: uid,
  value,
  rank,
});

describe("splitLeadPack", () => {
  it("splits empty, short, and long lists", () => {
    expect(splitLeadPack([])).toEqual({ lead: [], rest: [] });
    expect(splitLeadPack([entry("a", 1)]).lead).toHaveLength(1);
    expect(splitLeadPack([entry("a", 1)]).rest).toHaveLength(0);
    const many = [1, 2, 3, 4, 5].map((r) => entry(`u${r}`, r));
    expect(splitLeadPack(many).lead.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(splitLeadPack(many).rest.map((e) => e.rank)).toEqual([4, 5]);
  });
});

describe("resolveSelfFooterMode", () => {
  it("hides when row in view", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: entry("me", 5),
        selfEntry: null,
        selfError: false,
        rowInView: true,
      }),
    ).toBe("hidden");
  });

  it("pins when in list but off-screen", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: entry("me", 5),
        selfEntry: null,
        selfError: false,
        rowInView: false,
      }),
    ).toBe("pinned");
  });

  it("uses off_list when self doc exists outside top 50", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: null,
        selfEntry: entry("me", 80, 12),
        selfError: false,
        rowInView: false,
      }),
    ).toBe("off_list");
  });

  it("unranked when no list and no self", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: null,
        selfEntry: null,
        selfError: false,
        rowInView: false,
      }),
    ).toBe("unranked");
  });

  it("error when self fetch failed and not in list", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: null,
        selfEntry: null,
        selfError: true,
        rowInView: false,
      }),
    ).toBe("error");
  });

  it("hides while self entry is loading and not in list", () => {
    expect(
      resolveSelfFooterMode({
        viewerUid: "me",
        listEntry: null,
        selfEntry: null,
        selfError: false,
        selfLoading: true,
        rowInView: false,
      }),
    ).toBe("hidden");
  });
});

describe("leaderboardBoardSummaryLabel", () => {
  it("joins size role metric", () => {
    expect(
      leaderboardBoardSummaryLabel({
        gameSize: "medium",
        role: "seeker",
        metric: "distance_traveled",
      }),
    ).toMatch(/Medium/);
  });
});
