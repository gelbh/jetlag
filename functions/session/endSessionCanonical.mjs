import { FieldValue } from "firebase-admin/firestore";

const TERMINAL_OUTCOMES = new Set(["found", "ended_early", "abandoned"]);

/**
 * Apply end writes inside an existing transaction (reads already done).
 * Returns true when a session update was applied.
 */
export function applyEndSessionInTx(tx, db, sessionRef, data, gameOutcome) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    const existingCode = typeof data.code === "string" ? data.code : null;
    if (existingCode) {
      tx.delete(db.collection("sessionCodes").doc(existingCode));
    }
    return false;
  }

  const code = typeof data.code === "string" ? data.code : null;
  const outcome = TERMINAL_OUTCOMES.has(data.gameOutcome)
    ? data.gameOutcome
    : gameOutcome;

  tx.update(sessionRef, {
    endedAt: new Date().toISOString(),
    status: "ended",
    gameOutcome: outcome,
    code: FieldValue.delete(),
  });

  if (code) {
    tx.delete(db.collection("sessionCodes").doc(code));
  }

  return true;
}

/**
 * Shared session end write: status/endedAt/gameOutcome + delete code field + delete sessionCodes doc.
 * Re-reads in a transaction so a concurrent `found` / other terminal outcome is not clobbered.
 * Code doc delete runs in the same transaction as the session update.
 */
export async function endSessionCanonical(db, sessionDoc, { gameOutcome }) {
  const sessionRef = sessionDoc.ref;

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(sessionRef);
    if (!fresh.exists) {
      return;
    }

    applyEndSessionInTx(tx, db, sessionRef, fresh.data() ?? {}, gameOutcome);
  });
}
