import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../../lib/appCheck.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import {
  buildContinueSeriesPlan,
  resolveGameProgression,
} from "../../session/castleSiege/seriesProgression.mjs";
import { posthogProjectApiKey, requireAuthSessionId } from "./shared.mjs";

const PLAYING_TEAMS = ["teamA", "teamB"];

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} sessionId
 */
async function clearTeamSealsAndMarks(db, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const batch = db.batch();
  for (const teamId of PLAYING_TEAMS) {
    batch.delete(sessionRef.collection("teamSeals").doc(teamId));
    batch.delete(sessionRef.collection("teamMarks").doc(teamId));
    batch.delete(sessionRef.collection("teamPressure").doc(teamId));
  }
  await batch.commit();
}

/**
 * Resolve a finished Siege game into series score / betweenGames / match end.
 *
 * data: { sessionId, reason: "capture" | "fewerQuestions" }
 * Host-only. Scoreboard writes are Admin SDK (client rules deny).
 */
export const resolveCastleSiegeGame = onCall(
  {
    secrets: [posthogProjectApiKey],
    enforceAppCheck,
  },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const reason = typeof request.data?.reason === "string" ? request.data.reason : "";
    if (reason !== "capture" && reason !== "fewerQuestions") {
      throw new HttpsError("invalid-argument", "reason must be capture or fewerQuestions.");
    }

    const db = getFirestore();
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }
    const session = sessionSnap.data() ?? {};
    if (session.mode !== "castleSiege") {
      throw new HttpsError("failed-precondition", "Session is not Castle Siege.");
    }
    if (session.hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only the host can resolve series games.");
    }

    let askSnap = null;
    if (reason === "fewerQuestions") {
      askSnap = await sessionRef.collection("oracleAskReceipts").get();
    }

    const resolved = resolveGameProgression({ session, reason, askSnap });
    if (!resolved.ok) {
      if (resolved.code === "QUESTIONS_TIE") {
        throw new HttpsError(
          "failed-precondition",
          "Ask counts are tied; host must forfeit or abandon.",
        );
      }
      if (resolved.code === "CAPTURE_NOT_WON") {
        throw new HttpsError("failed-precondition", "Capture is not a win yet.");
      }
      if (resolved.code === "SERIES_ALREADY_ENDED") {
        throw new HttpsError("failed-precondition", "Series already ended.");
      }
      throw new HttpsError("invalid-argument", "Unable to resolve game.");
    }

    await sessionRef.update(resolved.patch);
    return {
      ok: true,
      kind: resolved.progression.kind,
      winner: resolved.winner,
      gameIndex: resolved.progression.state.gameIndex,
      score: resolved.progression.state.score,
      seriesOutcome: resolved.progression.state.seriesOutcome,
    };
  }),
);

/**
 * Host Continue from betweenGames → next-game setup (half swap + clear per-game state).
 *
 * data: { sessionId }
 */
export const continueCastleSiegeSeries = onCall(
  {
    secrets: [posthogProjectApiKey],
    enforceAppCheck,
  },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }
    const session = sessionSnap.data() ?? {};
    if (session.mode !== "castleSiege") {
      throw new HttpsError("failed-precondition", "Session is not Castle Siege.");
    }
    if (session.hostUid !== uid) {
      throw new HttpsError("permission-denied", "Only the host can continue the series.");
    }
    if (session.phase !== "betweenGames") {
      throw new HttpsError("failed-precondition", "Continue is only valid between games.");
    }
    if (session.seriesOutcome === "complete" || session.seriesOutcome === "abandoned") {
      throw new HttpsError("failed-precondition", "Series already ended.");
    }

    const plan = buildContinueSeriesPlan(session);
    /** @type {Record<string, unknown>} */
    const update = {
      phase: plan.phase,
      seriesStandoffOpener: plan.seriesStandoffOpener,
    };
    if (plan.coinAssignment) {
      update.coinAssignment = plan.coinAssignment;
    }
    for (const key of plan.clearKeys) {
      update[key] = FieldValue.delete();
    }
    await sessionRef.update(update);
    await clearTeamSealsAndMarks(db, sessionId);

    return {
      ok: true,
      phase: "setup",
      seriesStandoffOpener: plan.seriesStandoffOpener,
    };
  }),
);
