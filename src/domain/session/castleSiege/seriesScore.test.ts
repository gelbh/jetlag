import { describe, expect, it } from "vitest";
import {
  abandonMatch,
  awardGameWin,
  createInitialSeriesState,
  forfeitGame,
  forfeitSeries,
  winsNeeded,
} from "./seriesScore";

describe("seriesScore", () => {
  it("initializes 1-based gameIndex and zero score", () => {
    expect(createInitialSeriesState(1)).toEqual({
      seriesLength: 1,
      gameIndex: 1,
      score: { teamA: 0, teamB: 0 },
      seriesOutcome: null,
    });
    expect(createInitialSeriesState(3).seriesLength).toBe(3);
    expect(winsNeeded(1)).toBe(1);
    expect(winsNeeded(3)).toBe(2);
  });

  it("BO1: first game win ends the match (V11)", () => {
    const start = createInitialSeriesState(1);
    const result = awardGameWin(start, "teamA");
    expect(result.kind).toBe("matchEnd");
    expect(result.state.score).toEqual({ teamA: 1, teamB: 0 });
    expect(result.state.seriesOutcome).toBe("complete");
    expect(result.state.gameIndex).toBe(1);
  });

  it("BO3: 1–0 advances to betweenGames game 2", () => {
    const start = createInitialSeriesState(3);
    const result = awardGameWin(start, "teamA");
    expect(result).toEqual({
      kind: "betweenGames",
      state: {
        seriesLength: 3,
        gameIndex: 2,
        score: { teamA: 1, teamB: 0 },
        seriesOutcome: null,
      },
    });
  });

  it("BO3: 1–1 advances to game 3; next win crowns (V11)", () => {
    let state = createInitialSeriesState(3);
    let step = awardGameWin(state, "teamA");
    expect(step.kind).toBe("betweenGames");
    state = step.state;
    step = awardGameWin(state, "teamB");
    expect(step).toEqual({
      kind: "betweenGames",
      state: {
        seriesLength: 3,
        gameIndex: 3,
        score: { teamA: 1, teamB: 1 },
        seriesOutcome: null,
      },
    });
    state = step.state;
    step = awardGameWin(state, "teamB");
    expect(step.kind).toBe("matchEnd");
    expect(step.state.score).toEqual({ teamA: 1, teamB: 2 });
    expect(step.state.seriesOutcome).toBe("complete");
  });

  it("BO3: 2–0 after game 2 ends without game 3", () => {
    let state = createInitialSeriesState(3);
    state = awardGameWin(state, "teamA").state;
    const result = awardGameWin(state, "teamA");
    expect(result.kind).toBe("matchEnd");
    expect(result.state.score).toEqual({ teamA: 2, teamB: 0 });
    expect(result.state.gameIndex).toBe(2);
    expect(result.state.seriesOutcome).toBe("complete");
  });

  it("forfeitGame awards the opponent then progresses", () => {
    const start = createInitialSeriesState(3);
    const result = forfeitGame(start, "teamA");
    expect(result.kind).toBe("betweenGames");
    expect(result.state.score).toEqual({ teamA: 0, teamB: 1 });
    expect(result.state.gameIndex).toBe(2);
  });

  it("forfeitSeries crowns the opponent without further games", () => {
    const mid = awardGameWin(createInitialSeriesState(3), "teamA").state;
    const result = forfeitSeries(mid, "teamA");
    expect(result.kind).toBe("matchEnd");
    expect(result.state.seriesOutcome).toBe("complete");
    expect(result.state.score.teamB).toBeGreaterThanOrEqual(winsNeeded(3));
    expect(result.state.score.teamB).toBeGreaterThan(result.state.score.teamA);
  });

  it("abandonMatch sets abandoned without awarding", () => {
    const mid = awardGameWin(createInitialSeriesState(3), "teamA").state;
    const result = abandonMatch(mid);
    expect(result.kind).toBe("matchEnd");
    expect(result.state.seriesOutcome).toBe("abandoned");
    expect(result.state.score).toEqual(mid.score);
  });

  it("ignores awards after the series already ended", () => {
    const ended = awardGameWin(createInitialSeriesState(1), "teamA");
    expect(ended.kind).toBe("matchEnd");
    const again = awardGameWin(ended.state, "teamB");
    expect(again).toEqual(ended);
  });
});
