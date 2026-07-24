import { FieldValue } from "firebase-admin/firestore";

const TERMINAL_OUTCOMES = new Set(["found", "ended_early", "abandoned"]);

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

    const data = fresh.data() ?? {};
    const code = typeof data.code === "string" ? data.code : null;

    if (data.status === "ended" || typeof data.endedAt === "string") {
      if (code) {
        tx.delete(db.collection("sessionCodes").doc(code));
      }
      return;
    }

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
  });
}
