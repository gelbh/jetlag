import { describe, expect, it } from "vitest";
import {
  buildBetweenGamesContinuePatch,
  buildGameResolvedPatch,
  flipCoinAssignment,
  flipStandoffOpener,
} from "./betweenGames";
import { awardGameWin, createInitialSeriesState } from "./seriesScore";

describe("betweenGames", () => {
  it("flips coin halves so teams swap sides", () => {
    expect(flipCoinAssignment({ teamA: "left", teamB: "right" })).toEqual({
      teamA: "right",
      teamB: "left",
    });
  });

  it("flips which team opens the next Standoff", () => {
    expect(flipStandoffOpener("teamA")).toBe("teamB");
    expect(flipStandoffOpener("teamB")).toBe("teamA");
  });

  it("buildGameResolvedPatch sets betweenGames after BO3 first win", () => {
    const progression = awardGameWin(createInitialSeriesState(3), "teamA");
    expect(progression.kind).toBe("betweenGames");
    const patch = buildGameResolvedPatch(progression);
    expect(patch).toMatchObject({
      phase: "betweenGames",
      gameIndex: 2,
      score: { teamA: 1, teamB: 0 },
    });
    expect(patch).not.toHaveProperty("seriesOutcome");
  });

  it("buildGameResolvedPatch sets complete on match end", () => {
    const progression = awardGameWin(createInitialSeriesState(1), "teamB");
    expect(progression.kind).toBe("matchEnd");
    expect(buildGameResolvedPatch(progression)).toMatchObject({
      gameIndex: 1,
      score: { teamA: 0, teamB: 1 },
      seriesOutcome: "complete",
    });
  });

  it("continue patch flips coin, opener, clears per-game fields, returns to setup", () => {
    const patch = buildBetweenGamesContinuePatch({
      setupMode: "pregame",
      coinAssignment: { teamA: "left", teamB: "right" },
      standoffOpener: "teamA",
    });
    expect(patch.phase).toBe("setup");
    expect(patch.coinAssignment).toEqual({ teamA: "right", teamB: "left" });
    expect(patch.seriesStandoffOpener).toBe("teamB");
    expect(patch.clearPerGameKeys).toEqual(
      expect.arrayContaining([
        "standoffTurn",
        "standoffDeckRemainingCount",
        "siegeClock",
        "siegeCapture",
      ]),
    );
    expect(patch.clearTeamSeals).toBe(true);
    expect(patch.clearTeamMarks).toBe(true);
  });

  it("fair-split continue keeps flipping halves via coinAssignment and still clears seals", () => {
    const patch = buildBetweenGamesContinuePatch({
      setupMode: "fairSplit",
      coinAssignment: { teamA: "left", teamB: "right" },
      standoffOpener: "teamB",
    });
    expect(patch.coinAssignment).toEqual({ teamA: "right", teamB: "left" });
    expect(patch.clearTeamSeals).toBe(true);
    expect(patch.seriesStandoffOpener).toBe("teamA");
  });
});
