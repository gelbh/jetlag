import {
  abandonMatch,
  awardGameWin,
  forfeitGame,
  forfeitSeries,
  seriesPatchFromProgression,
  seriesStateFromSession,
} from "./seriesScore.mjs";

export const BETWEEN_GAMES_CLEAR_KEYS = [
  "standoffTurn",
  "standoffDeckRemainingCount",
  "siegeClock",
  "siegeCapture",
];

/**
 * @param {FirebaseFirestore.QuerySnapshot | null} askSnap
 * @returns {{ teamA: number, teamB: number }}
 */
export function countAsksByAttackerTeam(askSnap) {
  const counts = { teamA: 0, teamB: 0 };
  if (!askSnap || askSnap.empty) {
    return counts;
  }
  for (const doc of askSnap.docs) {
    const team = doc.data()?.attackerTeamId;
    if (team === "teamA" || team === "teamB") {
      counts[team] += 1;
    }
  }
  return counts;
}

/**
 * @param {{ teamA: number, teamB: number }} counts
 * @returns {"teamA" | "teamB" | "tie"}
 */
export function winnerFromFewerQuestions(counts) {
  if (counts.teamA === counts.teamB) {
    return "tie";
  }
  return counts.teamA < counts.teamB ? "teamA" : "teamB";
}

/**
 * @param {unknown} capture
 * @returns {"teamA" | "teamB" | null}
 */
export function captureWinnerTeam(capture) {
  if (!capture || typeof capture !== "object") {
    return null;
  }
  const status = capture.status;
  if (status !== "confirmed" && status !== "timeout") {
    return null;
  }
  const team = capture.attackingTeamId;
  return team === "teamA" || team === "teamB" ? team : null;
}

/**
 * @param {{
 *   session: object,
 *   reason: "capture" | "fewerQuestions",
 *   askSnap?: FirebaseFirestore.QuerySnapshot | null,
 * }} input
 */
export function resolveGameProgression(input) {
  const state = seriesStateFromSession(input.session);
  if (state.seriesOutcome != null) {
    return { ok: false, code: "SERIES_ALREADY_ENDED" };
  }
  if (input.session?.phase !== "siege") {
    return { ok: false, code: "NOT_IN_SIEGE" };
  }

  let winner = null;
  if (input.reason === "capture") {
    winner = captureWinnerTeam(input.session.siegeCapture);
    if (!winner) {
      return { ok: false, code: "CAPTURE_NOT_WON" };
    }
  } else if (input.reason === "fewerQuestions") {
    const counts = countAsksByAttackerTeam(input.askSnap ?? null);
    const decided = winnerFromFewerQuestions(counts);
    if (decided === "tie") {
      return { ok: false, code: "QUESTIONS_TIE" };
    }
    winner = decided;
  } else {
    return { ok: false, code: "INVALID_REASON" };
  }

  const progression = awardGameWin(state, winner);
  return {
    ok: true,
    winner,
    progression,
    patch: seriesPatchFromProgression(progression),
  };
}

/**
 * @param {object} coinAssignment
 */
export function flipCoinAssignment(coinAssignment) {
  return {
    teamA: coinAssignment.teamB,
    teamB: coinAssignment.teamA,
  };
}

/**
 * @param {"teamA" | "teamB"} opener
 */
export function flipStandoffOpener(opener) {
  return opener === "teamA" ? "teamB" : "teamA";
}

/**
 * True when another uid still holds the same playing role (teammate remains).
 *
 * @param {Record<string, unknown>} roles
 * @param {string} uid
 * @param {"teamA" | "teamB"} role
 */
export function hasTeammateOnPlayingRole(roles, uid, role) {
  for (const [otherUid, otherRole] of Object.entries(roles)) {
    if (otherUid !== uid && otherRole === role) {
      return true;
    }
  }
  return false;
}

/**
 * Series patch when a playing member leaves mid-match (auto forfeit).
 * Setup: no score change. betweenGames → forfeit series.
 * Otherwise forfeit current game only when this uid is the last on that role.
 *
 * @param {object} session
 * @param {string} uid
 * @returns {Record<string, unknown> | null}
 */
export function seriesPatchForPlayingMemberLeave(session, uid) {
  if (session?.mode !== "castleSiege") {
    return null;
  }
  const state = seriesStateFromSession(session);
  if (state.seriesOutcome != null) {
    return null;
  }
  if (session.phase === "setup") {
    return null;
  }
  const roles =
    session.castleSiegeRoles && typeof session.castleSiegeRoles === "object"
      ? session.castleSiegeRoles
      : {};
  const role = typeof roles[uid] === "string" ? roles[uid] : "";
  if (role !== "teamA" && role !== "teamB") {
    return null;
  }
  if (hasTeammateOnPlayingRole(roles, uid, role)) {
    return null;
  }
  const progression =
    session.phase === "betweenGames" ? forfeitSeries(state, role) : forfeitGame(state, role);
  return seriesPatchFromProgression(progression);
}

/**
 * @param {{
 *   session: object,
 *   action: "forfeitGame" | "forfeitSeries" | "abandon",
 *   forfeitingTeam?: "teamA" | "teamB",
 * }} input
 */
export function resolveForfeitProgression(input) {
  const state = seriesStateFromSession(input.session);
  if (state.seriesOutcome != null && input.action !== "abandon") {
    return { ok: false, code: "SERIES_ALREADY_ENDED" };
  }
  if (input.action === "abandon") {
    const progression = abandonMatch(state);
    return { ok: true, progression, patch: seriesPatchFromProgression(progression) };
  }
  if (input.action === "forfeitGame" && input.session?.phase === "betweenGames") {
    return { ok: false, code: "INVALID_PHASE" };
  }
  const team = input.forfeitingTeam;
  if (team !== "teamA" && team !== "teamB") {
    return { ok: false, code: "INVALID_TEAM" };
  }
  const progression =
    input.action === "forfeitSeries" ? forfeitSeries(state, team) : forfeitGame(state, team);
  return { ok: true, progression, patch: seriesPatchFromProgression(progression) };
}

export function buildContinueSeriesPlan(session) {
  const opener =
    session.seriesStandoffOpener === "teamB" || session.seriesStandoffOpener === "teamA"
      ? session.seriesStandoffOpener
      : "teamA";
  /** @type {{ phase: "setup", seriesStandoffOpener: "teamA" | "teamB", coinAssignment?: object, clearKeys: string[] }} */
  const plan = {
    phase: "setup",
    seriesStandoffOpener: flipStandoffOpener(opener),
    clearKeys: [...BETWEEN_GAMES_CLEAR_KEYS],
  };
  const coin = session.coinAssignment;
  if (
    coin &&
    typeof coin === "object" &&
    (coin.teamA === "left" || coin.teamA === "right") &&
    (coin.teamB === "left" || coin.teamB === "right") &&
    coin.teamA !== coin.teamB
  ) {
    plan.coinAssignment = flipCoinAssignment(coin);
  }
  return plan;
}
