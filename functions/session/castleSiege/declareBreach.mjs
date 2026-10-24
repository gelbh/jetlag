import { createHash } from "node:crypto";
import { evaluateDeclare } from "./declareEvaluate.mjs";
import { haversineMeters } from "./haversine.mjs";
import { decryptSealPayload } from "./sealDecrypt.mjs";
import { parseCanonicalSealPayload } from "./sealParse.mjs";

const SEAL_HASH_HEX = /^[0-9a-f]{64}$/;
const PLAYING_TEAMS = new Set(["teamA", "teamB"]);

/**
 * Decrypt defender seal and score a Declare without returning coords.
 *
 * @param {{
 *   envelope: object,
 *   committedHash?: string,
 *   wrappingKey?: Uint8Array,
 *   wrapKeyEnv?: string,
 *   declaringTeam: string,
 *   namedAnchor: string,
 *   guessLat: number,
 *   guessLng: number,
 *   breachToleranceMeters: number,
 * }} input
 */
export async function evaluateDeclareBreach(input) {
  if (!PLAYING_TEAMS.has(input.declaringTeam)) {
    throw new Error("DECLARE_INVALID_TEAM");
  }
  if (!Number.isFinite(input.guessLat) || !Number.isFinite(input.guessLng)) {
    throw new Error("DECLARE_INVALID_GUESS");
  }

  const plaintext = await decryptSealPayload(input.envelope, {
    wrappingKey: input.wrappingKey,
    wrapKeyEnv: input.wrapKeyEnv,
  });
  if (typeof input.committedHash === "string") {
    if (!SEAL_HASH_HEX.test(input.committedHash)) {
      throw new Error("ORACLE_HASH_MISMATCH");
    }
    const digest = createHash("sha256").update(plaintext, "utf8").digest("hex");
    if (digest !== input.committedHash) {
      throw new Error("ORACLE_HASH_MISMATCH");
    }
  }

  const seal = parseCanonicalSealPayload(plaintext);
  const distanceMeters = haversineMeters(input.guessLat, input.guessLng, seal.lat, seal.lng);
  const outcome = evaluateDeclare({
    declaringTeam: input.declaringTeam,
    namedAnchor: input.namedAnchor,
    sealedAnchorName: seal.anchorName,
    distanceMeters,
    breachToleranceMeters: input.breachToleranceMeters,
  });

  return { outcome };
}

/**
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   sessionId: string,
 *   defenderTeamId: string,
 *   declaringTeam: string,
 *   namedAnchor: string,
 *   guessLat: number,
 *   guessLng: number,
 *   wrappingKey?: Uint8Array,
 *   wrapKeyEnv?: string,
 * }} input
 */
export async function evaluateDeclareBreachFromSession(input) {
  const { db, sessionId, defenderTeamId } = input;
  const snap = await db
    .collection("sessions")
    .doc(sessionId)
    .collection("teamSeals")
    .doc(defenderTeamId)
    .get();

  if (!snap.exists) {
    throw new Error("ORACLE_SEAL_NOT_FOUND");
  }
  const data = snap.data() ?? {};
  if (!data.ciphertext || typeof data.ciphertext !== "object") {
    throw new Error("ORACLE_CIPHERTEXT_MISSING");
  }

  const sessionSnap = await db.collection("sessions").doc(sessionId).get();
  const dials = sessionSnap.data()?.dials;
  const breachToleranceMeters =
    dials && typeof dials.breachToleranceMeters === "number" ? dials.breachToleranceMeters : 50;

  return evaluateDeclareBreach({
    envelope: data.ciphertext,
    committedHash: typeof data.hash === "string" ? data.hash : undefined,
    wrappingKey: input.wrappingKey,
    wrapKeyEnv: input.wrapKeyEnv,
    declaringTeam: input.declaringTeam,
    namedAnchor: input.namedAnchor,
    guessLat: input.guessLat,
    guessLng: input.guessLng,
    breachToleranceMeters,
  });
}
