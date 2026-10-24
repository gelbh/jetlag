/** Pure BO1/BO3 scoreboard (mirror of src/domain/session/castleSiege/seriesScore.ts). */

/**
 * @param {1 | 3} seriesLength
 * @returns {number}
 */
export function winsNeeded(seriesLength) {
  return seriesLength === 1 ? 1 : 2;
}

/**
 * @param {1 | 3} seriesLength
 */
export function createInitialSeriesState(seriesLength) {
  return {
    seriesLength,
    gameIndex: 1,
    score: { teamA: 0, teamB: 0 },
    seriesOutcome: null,
  };
}

/**
 * @param {{ teamA: number, teamB: number }} score
 * @param {"teamA" | "teamB"} winner
 */
function withWin(score, winner) {
  return winner === "teamA"
    ? { teamA: score.teamA + 1, teamB: score.teamB }
    : { teamA: score.teamA, teamB: score.teamB + 1 };
}

/**
 * @param {"teamA" | "teamB"} team
 */
function opponentOf(team) {
  return team === "teamA" ? "teamB" : "teamA";
}

/**
 * @param {object} state
 * @param {{ teamA: number, teamB: number }} score
 * @param {number} gameIndex
 */
function progressionAfterScore(state, score, gameIndex) {
  const needed = winsNeeded(state.seriesLength);
  if (score.teamA >= needed || score.teamB >= needed) {
    return {
      kind: "matchEnd",
      state: { ...state, gameIndex, score, seriesOutcome: "complete" },
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

/**
 * @param {object} state
 * @param {"teamA" | "teamB"} winner
 */
export function awardGameWin(state, winner) {
  if (state.seriesOutcome != null) {
    return { kind: "matchEnd", state };
  }
  return progressionAfterScore(state, withWin(state.score, winner), state.gameIndex);
}

/**
 * @param {object} state
 * @param {"teamA" | "teamB"} forfeitingTeam
 */
export function forfeitGame(state, forfeitingTeam) {
  return awardGameWin(state, opponentOf(forfeitingTeam));
}

/**
 * @param {object} state
 * @param {"teamA" | "teamB"} forfeitingTeam
 */
export function forfeitSeries(state, forfeitingTeam) {
  if (state.seriesOutcome != null) {
    return { kind: "matchEnd", state };
  }
  const winner = opponentOf(forfeitingTeam);
  const needed = winsNeeded(state.seriesLength);
  const score =
    winner === "teamA"
      ? { teamA: Math.max(state.score.teamA, needed), teamB: state.score.teamB }
      : { teamA: state.score.teamA, teamB: Math.max(state.score.teamB, needed) };
  return {
    kind: "matchEnd",
    state: { ...state, score, seriesOutcome: "complete" },
  };
}

/**
 * @param {object} state
 */
export function abandonMatch(state) {
  return {
    kind: "matchEnd",
    state: { ...state, seriesOutcome: "abandoned" },
  };
}

/**
 * @param {unknown} session
 */
export function seriesStateFromSession(session) {
  const seriesLength = session?.seriesLength === 3 ? 3 : 1;
  const gameIndex =
    typeof session?.gameIndex === "number" &&
    Number.isInteger(session.gameIndex) &&
    session.gameIndex >= 1
      ? session.gameIndex
      : 1;
  const scoreRaw = session?.score && typeof session.score === "object" ? session.score : {};
  const teamA =
    typeof scoreRaw.teamA === "number" && Number.isInteger(scoreRaw.teamA) && scoreRaw.teamA >= 0
      ? scoreRaw.teamA
      : 0;
  const teamB =
    typeof scoreRaw.teamB === "number" && Number.isInteger(scoreRaw.teamB) && scoreRaw.teamB >= 0
      ? scoreRaw.teamB
      : 0;
  const seriesOutcome =
    session?.seriesOutcome === "complete" || session?.seriesOutcome === "abandoned"
      ? session.seriesOutcome
      : null;
  return { seriesLength, gameIndex, score: { teamA, teamB }, seriesOutcome };
}

/**
 * @param {object} progression
 */
export function seriesPatchFromProgression(progression) {
  const { state } = progression;
  const patch = {
    gameIndex: state.gameIndex,
    score: { teamA: state.score.teamA, teamB: state.score.teamB },
  };
  if (state.seriesOutcome != null) {
    patch.seriesOutcome = state.seriesOutcome;
  }
  if (progression.kind === "betweenGames") {
    patch.phase = "betweenGames";
  }
  return patch;
}
