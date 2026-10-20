import {
  answerCompassOracle,
  answerMatchingOracle,
  answerMeasuringOracle,
  answerPhotoMirrorOracle,
  answerTentacleOracle,
} from "./oracleKinds.mjs";
import { answerRadarOracle } from "./oracleRadar.mjs";
import {
  decryptSealPayload,
  encryptSealPayload,
  TEST_SEAL_WRAP_KEY_BYTES,
  TEST_SEAL_WRAP_KEY_ID,
} from "./sealDecrypt.mjs";
import { parseCanonicalSealPayload } from "./sealParse.mjs";

export {
  encryptSealPayload as encryptSealPayloadForTests,
  TEST_SEAL_WRAP_KEY_BYTES,
  TEST_SEAL_WRAP_KEY_ID,
};

/**
 * Dispatch a Castle Siege ask against a decrypted seal (no coords in receipt).
 * @param {{ lat: number, lng: number, anchorName: string, secretPhrase: string }} seal
 * @param {{ kind: string } & Record<string, unknown>} ask
 */
export function dispatchOracleAsk(seal, ask) {
  if (!ask || typeof ask.kind !== "string") {
    throw new Error("Oracle ask kind is required.");
  }

  switch (ask.kind) {
    case "radar":
      return answerRadarOracle(seal, ask);
    case "matching":
      return answerMatchingOracle(seal, ask);
    case "measuring":
      return answerMeasuringOracle(seal, ask);
    case "tentacle":
      return answerTentacleOracle(seal, ask);
    case "photo":
      return answerPhotoMirrorOracle(ask);
    case "compass":
      return answerCompassOracle(seal, ask);
    default:
      throw new Error(`Unsupported oracle ask kind: ${ask.kind}`);
  }
}

/**
 * Decrypt fixture/production envelope and answer without leaking coords.
 *
 * @param {{
 *   envelope: object,
 *   wrappingKey?: Uint8Array,
 *   wrapKeyEnv?: string,
 *   ask: { kind: string } & Record<string, unknown>,
 * }} input
 */
export async function answerOracleAsk(input) {
  const plaintext = await decryptSealPayload(input.envelope, {
    wrappingKey: input.wrappingKey,
    wrapKeyEnv: input.wrapKeyEnv,
  });
  const seal = parseCanonicalSealPayload(plaintext);
  return dispatchOracleAsk(seal, input.ask);
}

/**
 * Load team seal ciphertext from Firestore and answer (callable path).
 *
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   sessionId: string,
 *   defenderTeamId: string,
 *   ask: { kind: string } & Record<string, unknown>,
 *   wrappingKey?: Uint8Array,
 *   wrapKeyEnv?: string,
 * }} input
 */
export async function answerOracleAskFromSession(input) {
  const { db, sessionId, defenderTeamId, ask } = input;
  if (!sessionId || !defenderTeamId) {
    throw new Error("sessionId and defenderTeamId are required.");
  }

  const snap = await db
    .collection("sessions")
    .doc(sessionId)
    .collection("teamSeals")
    .doc(defenderTeamId)
    .get();

  if (!snap.exists) {
    throw new Error("ORACLE_SEAL_NOT_FOUND");
  }

  const ciphertext = snap.data()?.ciphertext;
  if (!ciphertext) {
    throw new Error("ORACLE_CIPHERTEXT_MISSING");
  }

  return answerOracleAsk({
    envelope: ciphertext,
    wrappingKey: input.wrappingKey,
    wrapKeyEnv: input.wrapKeyEnv,
    ask,
  });
}
