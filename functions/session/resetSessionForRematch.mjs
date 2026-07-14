import { FieldValue } from "firebase-admin/firestore";
import { isSessionMember } from "../proxies/verifyProxyAccess.mjs";

export const REMATCH_SESSION_NOT_FOUND = "REMATCH_SESSION_NOT_FOUND";
export const REMATCH_NOT_MEMBER = "REMATCH_NOT_MEMBER";

function swapSeekerHiderRoles(memberRoles) {
  if (!memberRoles || typeof memberRoles !== "object") {
    return {};
  }

  const swapped = { ...memberRoles };

  for (const [uid, role] of Object.entries(memberRoles)) {
    if (role === "seeker") {
      swapped[uid] = "hider";
    } else if (role === "hider") {
      swapped[uid] = "seeker";
    }
  }

  return swapped;
}

export async function resetSessionForRematchHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);

  await db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(REMATCH_SESSION_NOT_FOUND);
    }

    const session = sessionSnap.data() ?? {};
    if (!isSessionMember(session, uid)) {
      throw new Error(REMATCH_NOT_MEMBER);
    }
    const roundNumber =
      typeof session.roundNumber === "number" ? session.roundNumber : 0;
    const gameResultId =
      typeof session.gameResultId === "string" ? session.gameResultId : null;

    if (gameResultId) {
      const gameResultRef = sessionRef.collection("gameResult").doc(gameResultId);
      const gameResultSnap = await transaction.get(gameResultRef);
      if (gameResultSnap.exists) {
        const archiveRef = sessionRef.collection("rounds").doc(String(roundNumber));
        transaction.set(archiveRef, {
          ...gameResultSnap.data(),
          archivedAt: new Date().toISOString(),
          archivedByUid: uid,
        });
        transaction.delete(gameResultRef);
      }
    }

    transaction.update(sessionRef, {
      memberRoles: swapSeekerHiderRoles(session.memberRoles ?? {}),
      roundNumber: roundNumber + 1,
      sessionResetAt: new Date().toISOString(),
      timerAccumulatedMs: 0,
      timerRunningSince: FieldValue.delete(),
      endGameStartedAt: FieldValue.delete(),
      endGameStartedByUid: FieldValue.delete(),
      endGameRequestedAt: FieldValue.delete(),
      endGameRequestedByUid: FieldValue.delete(),
      foundRequestedAt: FieldValue.delete(),
      foundRequestedByUid: FieldValue.delete(),
      foundConfirmedAt: FieldValue.delete(),
      foundConfirmedByUid: FieldValue.delete(),
      gameOutcome: FieldValue.delete(),
      gameResultId: FieldValue.delete(),
    });
  });
}
