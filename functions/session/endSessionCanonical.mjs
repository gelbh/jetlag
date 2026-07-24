import { FieldValue } from "firebase-admin/firestore";

/**
 * Shared session end write: status/endedAt/gameOutcome + delete code field + delete sessionCodes doc.
 * Preserves an existing `found` outcome.
 */
export async function endSessionCanonical(db, sessionDoc, { gameOutcome }) {
  const data = sessionDoc.data() ?? {};
  const code = typeof data.code === "string" ? data.code : null;
  const outcome = data.gameOutcome === "found" ? "found" : gameOutcome;

  await sessionDoc.ref.update({
    endedAt: new Date().toISOString(),
    status: "ended",
    gameOutcome: outcome,
    code: FieldValue.delete(),
  });

  if (code) {
    await db.collection("sessionCodes").doc(code).delete();
  }
}
