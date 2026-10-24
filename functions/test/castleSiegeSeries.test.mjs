import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captureWinnerTeam,
  countAsksByAttackerTeam,
  resolveForfeitProgression,
  resolveGameProgression,
  seriesPatchForPlayingMemberLeave,
  winnerFromFewerQuestions,
} from "../session/castleSiege/seriesProgression.mjs";
import {
  awardGameWin,
  createInitialSeriesState,
  seriesPatchFromProgression,
} from "../session/castleSiege/seriesScore.mjs";

describe("castleSiege series progression", () => {
  it("mirrors BO1/BO3 award rules (V11)", () => {
    const bo1 = awardGameWin(createInitialSeriesState(1), "teamA");
    assert.equal(bo1.kind, "matchEnd");
    assert.equal(bo1.state.seriesOutcome, "complete");

    const first = awardGameWin(createInitialSeriesState(3), "teamA");
    assert.equal(first.kind, "betweenGames");
    assert.equal(first.state.gameIndex, 2);
    const patch = seriesPatchFromProgression(first);
    assert.equal(patch.phase, "betweenGames");
    assert.deepEqual(patch.score, { teamA: 1, teamB: 0 });
  });

  it("resolves capture wins from siegeCapture", () => {
    assert.equal(captureWinnerTeam({ status: "pending", attackingTeamId: "teamA" }), null);
    assert.equal(captureWinnerTeam({ status: "confirmed", attackingTeamId: "teamB" }), "teamB");
    assert.equal(captureWinnerTeam({ status: "timeout", attackingTeamId: "teamA" }), "teamA");

    const resolved = resolveGameProgression({
      reason: "capture",
      session: {
        seriesLength: 1,
        gameIndex: 1,
        score: { teamA: 0, teamB: 0 },
        siegeCapture: { status: "confirmed", attackingTeamId: "teamA" },
      },
    });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.winner, "teamA");
    assert.equal(resolved.progression.kind, "matchEnd");
  });

  it("awards fewer Phase 1 questions; ties stay host-gated", () => {
    const askSnap = {
      empty: false,
      docs: [
        { data: () => ({ attackerTeamId: "teamA" }) },
        { data: () => ({ attackerTeamId: "teamA" }) },
        { data: () => ({ attackerTeamId: "teamB" }) },
      ],
    };
    const counts = countAsksByAttackerTeam(askSnap);
    assert.deepEqual(counts, { teamA: 2, teamB: 1 });
    assert.equal(winnerFromFewerQuestions(counts), "teamB");
    assert.equal(winnerFromFewerQuestions({ teamA: 1, teamB: 1 }), "tie");

    const tied = resolveGameProgression({
      reason: "fewerQuestions",
      session: {
        seriesLength: 3,
        gameIndex: 1,
        score: { teamA: 0, teamB: 0 },
      },
      askSnap: {
        empty: false,
        docs: [
          { data: () => ({ attackerTeamId: "teamA" }) },
          { data: () => ({ attackerTeamId: "teamB" }) },
        ],
      },
    });
    assert.equal(tied.ok, false);
    assert.equal(tied.code, "QUESTIONS_TIE");
  });

  it("forfeit game vs series vs abandon", () => {
    const mid = {
      mode: "castleSiege",
      seriesLength: 3,
      gameIndex: 2,
      score: { teamA: 1, teamB: 0 },
      phase: "siege",
      castleSiegeRoles: { u1: "teamA", u2: "teamB" },
    };
    const game = resolveForfeitProgression({
      session: mid,
      action: "forfeitGame",
      forfeitingTeam: "teamA",
    });
    assert.equal(game.ok, true);
    assert.equal(game.progression.kind, "betweenGames");
    assert.deepEqual(game.progression.state.score, { teamA: 1, teamB: 1 });

    const series = resolveForfeitProgression({
      session: { ...mid, phase: "betweenGames" },
      action: "forfeitSeries",
      forfeitingTeam: "teamA",
    });
    assert.equal(series.ok, true);
    assert.equal(series.progression.state.seriesOutcome, "complete");
    assert.ok(series.progression.state.score.teamB >= 2);

    const abandon = resolveForfeitProgression({ session: mid, action: "abandon" });
    assert.equal(abandon.ok, true);
    assert.equal(abandon.progression.state.seriesOutcome, "abandoned");
    assert.deepEqual(abandon.progression.state.score, mid.score);
  });

  it("leave mid-series auto-forfeits the leaver's team", () => {
    const leaveGame = seriesPatchForPlayingMemberLeave(
      {
        mode: "castleSiege",
        seriesLength: 3,
        gameIndex: 1,
        score: { teamA: 0, teamB: 0 },
        phase: "siege",
        castleSiegeRoles: { leavers: "teamB" },
      },
      "leavers",
    );
    assert.equal(leaveGame.phase, "betweenGames");
    assert.deepEqual(leaveGame.score, { teamA: 1, teamB: 0 });

    const leaveSeries = seriesPatchForPlayingMemberLeave(
      {
        mode: "castleSiege",
        seriesLength: 3,
        gameIndex: 2,
        score: { teamA: 1, teamB: 0 },
        phase: "betweenGames",
        castleSiegeRoles: { leavers: "teamA" },
      },
      "leavers",
    );
    assert.equal(leaveSeries.seriesOutcome, "complete");
  });
});
