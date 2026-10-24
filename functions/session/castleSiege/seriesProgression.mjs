import {
  awardGameWin,
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
 * @param {object} session
 * @returns {{
 *   phase: "setup",
 *   seriesStandoffOpener: "teamA" | "teamB",
 *   coinAssignment?: object,
 *   clearKeys: string[],
 * }}
 */
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
