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

function canRematchSession(session, uid) {
  if (isSessionMember(session, uid)) {
    return true;
  }
  if (typeof session.hostUid === "string" && session.hostUid === uid) {
    return true;
  }
  return (
    session.memberRoles != null &&
    typeof session.memberRoles === "object" &&
    Object.prototype.hasOwnProperty.call(session.memberRoles, uid)
  );
}

function healMemberUids(session, uid) {
  const existing = Array.isArray(session.memberUids)
    ? session.memberUids.filter((memberUid) => typeof memberUid === "string")
    : [];
  if (existing.includes(uid)) {
    return existing;
  }
  return [...existing, uid];
}

export async function resetSessionForRematchHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const anchorsRef = sessionRef.collection("endGameTruth").doc("anchors");

  await db.runTransaction(async (transaction) => {
    // All reads before any writes (Admin SDK READ_AFTER_WRITE).
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(REMATCH_SESSION_NOT_FOUND);
    }

    const session = sessionSnap.data() ?? {};
    if (!canRematchSession(session, uid)) {
      throw new Error(REMATCH_NOT_MEMBER);
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

    const memberUids = healMemberUids(session, uid);
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
      memberUids,
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
  });
}
