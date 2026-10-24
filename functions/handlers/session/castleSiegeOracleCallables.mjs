import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../../lib/appCheck.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { answerOracleAskFromSession } from "../../session/castleSiege/answerOracleAsk.mjs";
import { evaluateDeclareBreachFromSession } from "../../session/castleSiege/declareBreach.mjs";
import { recomputeAndWritePressure } from "../../session/castleSiege/recomputePressure.mjs";
import { decodeSealWrapKeyFromEnv } from "../../session/castleSiege/sealDecrypt.mjs";
import { castleSiegeSealWrapKey } from "../../session/castleSiege/sealWrapKey.mjs";
import { posthogProjectApiKey, requireAuthSessionId } from "./shared.mjs";

const PLAYING_TEAMS = new Set(["teamA", "teamB"]);
const DECLARE_RATE_ROUTE = "declareCastleSiege";
const DECLARE_RATE_LIMIT = 12;
const DECLARE_RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Castle Siege oracle: decrypt defender seal, answer ask, never return coords (V4).
 *
 * data: { sessionId, defenderTeamId, ask: { kind, ... } }
 */
export const answerCastleSiegeOracleAsk = onCall(
  {
    secrets: [posthogProjectApiKey, castleSiegeSealWrapKey],
    enforceAppCheck,
  },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const defenderTeamId =
      typeof request.data?.defenderTeamId === "string" ? request.data.defenderTeamId : "";
    const ask = request.data?.ask;

    if (!PLAYING_TEAMS.has(defenderTeamId)) {
      throw new HttpsError("invalid-argument", "defenderTeamId must be teamA or teamB.");
    }
    if (!ask || typeof ask !== "object" || typeof ask.kind !== "string") {
      throw new HttpsError("invalid-argument", "ask.kind is required.");
    }

    const db = getFirestore();
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }

    const session = sessionSnap.data() ?? {};
    if (session.mode !== "castleSiege") {
      throw new HttpsError("failed-precondition", "Session is not Castle Siege.");
    }

    const members = session.memberUids;
    if (!Array.isArray(members) || !members.includes(uid)) {
      throw new HttpsError("permission-denied", "Session membership required.");
    }

    // Only the opposing playing team may probe a defender seal (not observers / own team).
    const castleRoles =
      session.castleSiegeRoles && typeof session.castleSiegeRoles === "object"
        ? session.castleSiegeRoles
        : {};
    const callerRole = typeof castleRoles[uid] === "string" ? castleRoles[uid] : "";
    if (!PLAYING_TEAMS.has(callerRole)) {
      throw new HttpsError("permission-denied", "Only playing teams can ask the oracle.");
    }
    if (callerRole === defenderTeamId) {
      throw new HttpsError("permission-denied", "Cannot ask the oracle about your own seal.");
    }

    let wrappingKey;
    try {
      wrappingKey = decodeSealWrapKeyFromEnv(castleSiegeSealWrapKey.value());
    } catch {
      throw new HttpsError("failed-precondition", "Seal wrap key is not configured.");
    }

    try {
      const receipt = await answerOracleAskFromSession({
        db,
        sessionId,
        defenderTeamId,
        ask,
        wrappingKey,
      });
      try {
        await recomputeAndWritePressure({
          db,
          sessionId,
          defenderTeamId,
          attackerTeamId: callerRole,
        });
      } catch {
        // Best-effort H5 after ask.
      }
      return { ok: true, receipt };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "ORACLE_SEAL_NOT_FOUND") {
          throw new HttpsError("not-found", "Defender seal not found.");
        }
        if (error.message === "ORACLE_CIPHERTEXT_MISSING") {
          throw new HttpsError("failed-precondition", "Defender seal ciphertext missing.");
        }
        if (error.message === "ORACLE_HASH_MISMATCH") {
          throw new HttpsError(
            "failed-precondition",
            "Defender seal hash does not match ciphertext.",
          );
        }
        if (/exceeds \d+ items/i.test(error.message)) {
          throw new HttpsError("invalid-argument", error.message);
        }
        if (/Unsupported oracle ask kind/i.test(error.message)) {
          throw new HttpsError("invalid-argument", error.message);
        }
        if (
          /Invalid (radar|matching|measuring|tentacle|photo|compass) ask|Oracle ask kind/i.test(
            error.message,
          )
        ) {
          throw new HttpsError("invalid-argument", error.message);
        }
        if (/Seal decrypt failed|Invalid seal/i.test(error.message)) {
          throw new HttpsError("failed-precondition", "Could not decrypt defender seal.");
        }
      }
      throw error;
    }
  }),
);

/**
 * Declare Siege: distance vs defender seal; returns breach|misfire without coords (V8).
 *
 * data: { sessionId, defenderTeamId, namedAnchor, guessLat, guessLng }
 */
export const declareCastleSiege = onCall(
  {
    secrets: [posthogProjectApiKey, castleSiegeSealWrapKey],
    enforceAppCheck,
  },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const defenderTeamId =
      typeof request.data?.defenderTeamId === "string" ? request.data.defenderTeamId : "";
    const namedAnchor =
      typeof request.data?.namedAnchor === "string" ? request.data.namedAnchor : "";
    const guessLat = Number(request.data?.guessLat);
    const guessLng = Number(request.data?.guessLng);

    if (!PLAYING_TEAMS.has(defenderTeamId)) {
      throw new HttpsError("invalid-argument", "defenderTeamId must be teamA or teamB.");
    }
    if (!Number.isFinite(guessLat) || !Number.isFinite(guessLng)) {
      throw new HttpsError("invalid-argument", "guessLat and guessLng are required.");
    }

    const db = getFirestore();
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }

    const session = sessionSnap.data() ?? {};
    if (session.mode !== "castleSiege") {
      throw new HttpsError("failed-precondition", "Session is not Castle Siege.");
    }
    if (session.phase !== "standoff") {
      throw new HttpsError("failed-precondition", "Declare is only allowed during Standoff.");
    }

    const members = session.memberUids;
    if (!Array.isArray(members) || !members.includes(uid)) {
      throw new HttpsError("permission-denied", "Session membership required.");
    }

    const castleRoles =
      session.castleSiegeRoles && typeof session.castleSiegeRoles === "object"
        ? session.castleSiegeRoles
        : {};
    const callerRole = typeof castleRoles[uid] === "string" ? castleRoles[uid] : "";
    if (!PLAYING_TEAMS.has(callerRole)) {
      throw new HttpsError("permission-denied", "Only playing teams can declare.");
    }
    if (callerRole === defenderTeamId) {
      throw new HttpsError("permission-denied", "Cannot declare against your own seal.");
    }

    const rate = await consumeRateLimit(db, {
      route: `${DECLARE_RATE_ROUTE}:${sessionId}`,
      uid,
      limit: DECLARE_RATE_LIMIT,
      windowMs: DECLARE_RATE_WINDOW_MS,
    });
    if (!rate.allowed) {
      throw new HttpsError("resource-exhausted", "Too many Declare attempts. Try again later.");
    }

    let wrappingKey;
    try {
      wrappingKey = decodeSealWrapKeyFromEnv(castleSiegeSealWrapKey.value());
    } catch {
      throw new HttpsError("failed-precondition", "Seal wrap key is not configured.");
    }

    try {
      const result = await evaluateDeclareBreachFromSession({
        db,
        sessionId,
        defenderTeamId,
        declaringTeam: callerRole,
        namedAnchor,
        guessLat,
        guessLng,
        wrappingKey,
      });

      await db.collection("sessions").doc(sessionId).collection("declareAttempts").add({
        uid,
        declaringTeam: callerRole,
        defenderTeamId,
        outcome: result.outcome,
        createdAt: FieldValue.serverTimestamp(),
      });

      try {
        await recomputeAndWritePressure({
          db,
          sessionId,
          defenderTeamId,
          attackerTeamId: callerRole,
          declareDistanceMeters: result.distanceMeters,
        });
      } catch {
        // Best-effort H5; Declare outcome still stands.
      }

      return { ok: true, outcome: result.outcome };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "ORACLE_SEAL_NOT_FOUND") {
          throw new HttpsError("not-found", "Defender seal not found.");
        }
        if (error.message === "ORACLE_CIPHERTEXT_MISSING") {
          throw new HttpsError("failed-precondition", "Defender seal ciphertext missing.");
        }
        if (error.message === "ORACLE_HASH_MISMATCH") {
          throw new HttpsError(
            "failed-precondition",
            "Defender seal hash does not match ciphertext.",
          );
        }
        if (/Seal decrypt failed|Invalid seal/i.test(error.message)) {
          throw new HttpsError("failed-precondition", "Could not decrypt defender seal.");
        }
      }
      throw error;
    }
  }),
);

/**
 * Recompute H5 pressure after attacker shade sync (defenders-only write).
 * data: { sessionId, defenderTeamId, nearestAttackerDistanceMeters? }
 */
export const recomputeCastleSiegePressure = onCall(
  {
    secrets: [posthogProjectApiKey],
    enforceAppCheck,
  },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const defenderTeamId =
      typeof request.data?.defenderTeamId === "string" ? request.data.defenderTeamId : "";
    if (!PLAYING_TEAMS.has(defenderTeamId)) {
      throw new HttpsError("invalid-argument", "defenderTeamId must be teamA or teamB.");
    }

    const db = getFirestore();
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }
    const session = sessionSnap.data() ?? {};
    if (session.mode !== "castleSiege") {
      throw new HttpsError("failed-precondition", "Session is not Castle Siege.");
    }
    const members = session.memberUids;
    if (!Array.isArray(members) || !members.includes(uid)) {
      throw new HttpsError("permission-denied", "Session membership required.");
    }
    const castleRoles =
      session.castleSiegeRoles && typeof session.castleSiegeRoles === "object"
        ? session.castleSiegeRoles
        : {};
    const callerRole = typeof castleRoles[uid] === "string" ? castleRoles[uid] : "";
    if (!PLAYING_TEAMS.has(callerRole)) {
      throw new HttpsError("permission-denied", "Only playing teams can refresh pressure.");
    }
    if (callerRole === defenderTeamId) {
      throw new HttpsError("permission-denied", "Attackers refresh defender pressure.");
    }

    const nearest =
      typeof request.data?.nearestAttackerDistanceMeters === "number"
        ? request.data.nearestAttackerDistanceMeters
        : null;

    const reading = await recomputeAndWritePressure({
      db,
      sessionId,
      defenderTeamId,
      attackerTeamId: callerRole,
      nearestAttackerDistanceMeters: nearest,
    });

    // Scalar+band only; never marks or coords.
    return { ok: true, scalar: reading.scalar, band: reading.band };
  }),
);
