import { FieldValue } from "firebase-admin/firestore";

const TERMINAL_OUTCOMES = new Set(["found", "ended_early", "abandoned"]);

/**
 * Apply end writes inside an existing transaction (reads already done).
 * Returns the applied gameOutcome string, or false when no session update was applied.
 *
 * @param {FirebaseFirestore.Transaction} tx
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference} sessionRef
 * @param {object} data
 * @param {string} gameOutcome
 * @param {Record<string, unknown>} [extraFields] merged into the same session update
 */
export function applyEndSessionInTx(tx, db, sessionRef, data, gameOutcome, extraFields) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    const existingCode = typeof data.code === "string" ? data.code : null;
    if (existingCode) {
      tx.delete(db.collection("sessionCodes").doc(existingCode));
    }
    return false;
  }

  const code = typeof data.code === "string" ? data.code : null;
  const outcome = TERMINAL_OUTCOMES.has(data.gameOutcome) ? data.gameOutcome : gameOutcome;

  tx.update(sessionRef, {
    ...(extraFields && typeof extraFields === "object" ? extraFields : {}),
    endedAt: new Date().toISOString(),
    status: "ended",
    gameOutcome: outcome,
    code: FieldValue.delete(),
  });

  if (code) {
    tx.delete(db.collection("sessionCodes").doc(code));
  }

  return outcome;
}

/**
 * Shared session end write: status/endedAt/gameOutcome + delete code field + delete sessionCodes doc.
 * Re-reads in a transaction so a concurrent `found` / other terminal outcome is not clobbered.
 * Code doc delete runs in the same transaction as the session update.
 * @returns {Promise<false | string>} applied gameOutcome, or false when no update applied
 */
export async function endSessionCanonical(db, sessionDoc, { gameOutcome }) {
  const sessionRef = sessionDoc.ref;

  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(sessionRef);
    if (!fresh.exists) {
      return false;
    }

    return applyEndSessionInTx(tx, db, sessionRef, fresh.data() ?? {}, gameOutcome);
  });
}
