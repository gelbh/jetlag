import { FieldValue } from "firebase-admin/firestore";
import { isSessionMember } from "../proxies/verifyProxyAccess.mjs";
import { resetSessionRoundExtras } from "./resetSessionRoundExtras.mjs";

export const REMATCH_SESSION_NOT_FOUND = "REMATCH_SESSION_NOT_FOUND";
export const REMATCH_NOT_MEMBER = "REMATCH_NOT_MEMBER";
export const REMATCH_NOT_OVER = "REMATCH_NOT_OVER";

export function isRematchRoundComplete(session) {
  return (
    typeof session?.foundConfirmedAt === "string" ||
    session?.gameOutcome === "found" ||
    session?.gameOutcome === "ended_early" ||
    session?.gameOutcome === "abandoned"
  );
}

export function isRematchIdle(session) {
  const timerStopped =
    session?.timerRunningSince == null ||
    session?.timerRunningSince === undefined;
  const accumulated =
    typeof session?.timerAccumulatedMs === "number"
      ? session.timerAccumulatedMs
      : 0;
  return (
    !isRematchRoundComplete(session) &&
    typeof session?.sessionResetAt === "string" &&
    timerStopped &&
    accumulated === 0
  );
}

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

/** Move role-gate leaders with the people who held them (secrets stay role-keyed). */
export function swapRoleGateLeaders(roleGates) {
  if (
    !roleGates ||
    roleGates.version !== 1 ||
    !roleGates.leaders ||
    typeof roleGates.leaders !== "object"
  ) {
    return roleGates ?? null;
  }

  const leaders = roleGates.leaders;
  const seekerLeader =
    typeof leaders.seeker === "string" ? leaders.seeker : undefined;
  const hiderLeader =
    typeof leaders.hider === "string" ? leaders.hider : undefined;
  const nextLeaders = {};

  if (hiderLeader) {
    nextLeaders.seeker = hiderLeader;
  }
  if (seekerLeader) {
    nextLeaders.hider = seekerLeader;
  }

  return { version: 1, leaders: nextLeaders };
}

export async function resetSessionForRematchHandler(db, uid, sessionId) {
  await runRematchSessionTransaction(db, uid, sessionId);
  try {
    await resetSessionRoundExtras(db, sessionId);
  } catch (error) {
    console.error("resetSessionRoundExtras failed", sessionId, error);
  }
}

async function runRematchSessionTransaction(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const anchorsRef = sessionRef.collection("endGameTruth").doc("anchors");

  return db.runTransaction(async (transaction) => {
    // All reads before any writes (Admin SDK READ_AFTER_WRITE).
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(REMATCH_SESSION_NOT_FOUND);
    }

    const session = sessionSnap.data() ?? {};
    // memberUids is membership SoT (same as verifyProxyAccess / rules).
    if (!isSessionMember(session, uid)) {
      throw new Error(REMATCH_NOT_MEMBER);
    }

    if (!isRematchRoundComplete(session)) {
      if (isRematchIdle(session)) {
        return "idle";
      }
      throw new Error(REMATCH_NOT_OVER);
    }

    const roundNumber =
      typeof session.roundNumber === "number" ? session.roundNumber : 0;
    const gameResultId =
      typeof session.gameResultId === "string" ? session.gameResultId : null;
    const gameResultRef = gameResultId
      ? sessionRef.collection("gameResult").doc(gameResultId)
      : null;
    const gameResultSnap = gameResultRef
      ? await transaction.get(gameResultRef)
      : null;
    const anchorsSnap = await transaction.get(anchorsRef);

    const swappedRoles = swapSeekerHiderRoles(session.memberRoles ?? {});
    const swappedRoleGates = swapRoleGateLeaders(session.roleGates);

    if (gameResultRef && gameResultSnap?.exists) {
      const archiveRef = sessionRef.collection("rounds").doc(String(roundNumber));
      transaction.set(archiveRef, {
        ...gameResultSnap.data(),
        archivedAt: new Date().toISOString(),
        archivedByUid: uid,
      });
      transaction.delete(gameResultRef);
    }

    if (anchorsSnap.exists) {
      transaction.delete(anchorsRef);
    }

    const update = {
      memberRoles: swappedRoles,
      roundNumber: roundNumber + 1,
      sessionResetAt: new Date().toISOString(),
      timerAccumulatedMs: 0,
      timerRunningSince: FieldValue.delete(),
      endGameStartedAt: FieldValue.delete(),
      endGameStartedByUid: FieldValue.delete(),
      endGameRequestedAt: FieldValue.delete(),
      endGameRequestedByUid: FieldValue.delete(),
      endGameTruthAnchors: FieldValue.delete(),
      foundRequestedAt: FieldValue.delete(),
      foundRequestedByUid: FieldValue.delete(),
      foundConfirmedAt: FieldValue.delete(),
      foundConfirmedByUid: FieldValue.delete(),
      gameOutcome: FieldValue.delete(),
      gameResultId: FieldValue.delete(),
    };

    if (swappedRoleGates != null) {
      update.roleGates = swappedRoleGates;
    }

    transaction.update(sessionRef, update);
    return "swapped";
  });
}
