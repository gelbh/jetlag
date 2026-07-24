import { applyEndSessionInTx, endSessionCanonical } from "./endSessionCanonical.mjs";
import { pickHostPromotee } from "./pickHostPromotee.mjs";

export { pickHostPromotee };

export const LEAVE_SESSION_NOT_FOUND = "LEAVE_SESSION_NOT_FOUND";
export const LEAVE_NOT_HOST = "LEAVE_NOT_HOST";
export const LEAVE_ALREADY_ENDED = "LEAVE_ALREADY_ENDED";

function assertHostSession(sessionSnap, uid) {
  if (!sessionSnap.exists) {
    throw new Error(LEAVE_SESSION_NOT_FOUND);
  }

  const data = sessionSnap.data() ?? {};
  if (data.status === "ended" || typeof data.endedAt === "string") {
    throw new Error(LEAVE_ALREADY_ENDED);
  }

  if (data.hostUid !== uid) {
    throw new Error(LEAVE_NOT_HOST);
  }

  return data;
}

export async function leaveHostSessionHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  let outcome = null;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const data = assertHostSession(sessionSnap, uid);
    const promotee = pickHostPromotee(
      data.memberUids,
      data.memberRoles,
      uid,
    );

    if (promotee == null) {
      applyEndSessionInTx(tx, db, sessionRef, data, "ended_early");
      outcome = { action: "ended" };
      return;
    }

    tx.update(sessionRef, { hostUid: promotee });
    outcome = { action: "promoted", newHostUid: promotee };
  });

  return outcome;
}

export async function endSessionHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionDoc = await sessionRef.get();
  assertHostSession(sessionDoc, uid);
  await endSessionCanonical(db, sessionDoc, { gameOutcome: "ended_early" });
  return { ok: true };
}
