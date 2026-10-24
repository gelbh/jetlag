import type { StandoffTeamId } from "./standoffTurn";

export type SeriesLength = 1 | 3;

export type SeriesScore = {
  teamA: number;
  teamB: number;
};

/** Terminal match result; null while the series is in progress. */
export type SeriesOutcome = "complete" | "abandoned";

export type SeriesState = {
  seriesLength: SeriesLength;
  /** 1-based index of the current (or last completed) game. */
  gameIndex: number;
  score: SeriesScore;
  seriesOutcome: SeriesOutcome | null;
};

export type SeriesProgression =
  | { kind: "betweenGames"; state: SeriesState }
  | { kind: "matchEnd"; state: SeriesState };

export function winsNeeded(seriesLength: SeriesLength): number {
  return seriesLength === 1 ? 1 : 2;
}

export function createInitialSeriesState(seriesLength: SeriesLength): SeriesState {
  return {
    seriesLength,
    gameIndex: 1,
    score: { teamA: 0, teamB: 0 },
    seriesOutcome: null,
  };
}

function opponentOf(team: StandoffTeamId): StandoffTeamId {
  return team === "teamA" ? "teamB" : "teamA";
}

function withWin(score: SeriesScore, winner: StandoffTeamId): SeriesScore {
  return winner === "teamA"
    ? { teamA: score.teamA + 1, teamB: score.teamB }
    : { teamA: score.teamA, teamB: score.teamB + 1 };
}

function progressionAfterScore(
  state: SeriesState,
  score: SeriesScore,
  gameIndex: number,
): SeriesProgression {
  const needed = winsNeeded(state.seriesLength);
  if (score.teamA >= needed || score.teamB >= needed) {
    return {
      kind: "matchEnd",
      state: {
        ...state,
        gameIndex,
        score,
        seriesOutcome: "complete",
      },
    };
  }
  return {
    kind: "betweenGames",
    state: {
      ...state,
      gameIndex: gameIndex + 1,
      score,
      seriesOutcome: null,
    },
  };
}

/** Award one game win; BO1 ends immediately, BO3 first-to-2 (V11). */
export function awardGameWin(state: SeriesState, winner: StandoffTeamId): SeriesProgression {
  if (state.seriesOutcome !== null) {
    return { kind: "matchEnd", state };
  }
  const score = withWin(state.score, winner);
  return progressionAfterScore(state, score, state.gameIndex);
}

/** Mid-game leave: forfeiting team loses the current game. */
export function forfeitGame(state: SeriesState, forfeitingTeam: StandoffTeamId): SeriesProgression {
  return awardGameWin(state, opponentOf(forfeitingTeam));
}

/**
 * Leave during betweenGames (or force-crown): opponent reaches winsNeeded.
 * Does not invent extra game indices.
 */
export function forfeitSeries(
  state: SeriesState,
  forfeitingTeam: StandoffTeamId,
): SeriesProgression {
  if (state.seriesOutcome !== null) {
    return { kind: "matchEnd", state };
  }
  const winner = opponentOf(forfeitingTeam);
  const needed = winsNeeded(state.seriesLength);
  const score: SeriesScore =
    winner === "teamA"
      ? { teamA: Math.max(state.score.teamA, needed), teamB: state.score.teamB }
      : { teamA: state.score.teamA, teamB: Math.max(state.score.teamB, needed) };
  return {
    kind: "matchEnd",
    state: {
      ...state,
      score,
      seriesOutcome: "complete",
    },
  };
}

/** Host abandon: end without awarding remaining games. */
export function abandonMatch(state: SeriesState): SeriesProgression {
  return {
    kind: "matchEnd",
    state: {
      ...state,
      seriesOutcome: "abandoned",
    },
  };
}
