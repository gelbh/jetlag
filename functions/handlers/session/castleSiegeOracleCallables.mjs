import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../../lib/appCheck.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { answerOracleAskFromSession } from "../../session/castleSiege/answerOracleAsk.mjs";
import { decodeSealWrapKeyFromEnv } from "../../session/castleSiege/sealDecrypt.mjs";
import { castleSiegeSealWrapKey } from "../../session/castleSiege/sealWrapKey.mjs";
import { posthogProjectApiKey, requireAuthSessionId } from "./shared.mjs";

const PLAYING_TEAMS = new Set(["teamA", "teamB"]);

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
      return { ok: true, receipt };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "ORACLE_SEAL_NOT_FOUND") {
          throw new HttpsError("not-found", "Defender seal not found.");
        }
        if (error.message === "ORACLE_CIPHERTEXT_MISSING") {
          throw new HttpsError("failed-precondition", "Defender seal ciphertext missing.");
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
