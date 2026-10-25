import { seriesPatchForPlayingMemberLeave } from "./castleSiege/seriesProgression.mjs";
import { applyEndSessionInTx } from "./endSessionCanonical.mjs";
import { LEAVE_ALREADY_ENDED, LEAVE_NOT_HOST, LEAVE_SESSION_NOT_FOUND } from "./hostLeave.mjs";
import { pickHostPromotee } from "./pickHostPromotee.mjs";
import {
  isRoleGatedSession,
  promoteOrClearRoleLeader,
  readMembershipFields,
  removeMemberFromMaps,
} from "./roleGateShared.mjs";

export const LEAVE_MEMBERSHIP_NOT_MEMBER = "LEAVE_MEMBERSHIP_NOT_MEMBER";
export const LEAVE_NOT_GATED = "LEAVE_NOT_GATED";

/**
 * Scrub leaving uid from castleSiegeRoles into the series leave patch (mutates patch).
 *
 * @param {object} data
 * @param {string} uid
 * @param {Record<string, unknown>} patch
 */
function applyCastleSiegeRoleScrub(data, uid, patch) {
  const castleRoles =
    data.castleSiegeRoles && typeof data.castleSiegeRoles === "object"
      ? { ...data.castleSiegeRoles }
      : null;
  if (castleRoles && uid in castleRoles) {
    delete castleRoles[uid];
    patch.castleSiegeRoles = castleRoles;
  }
}

function assertActiveSession(sessionSnap) {
  if (!sessionSnap.exists) {
    throw new Error(LEAVE_SESSION_NOT_FOUND);
  }

  const data = sessionSnap.data() ?? {};
  if (data.status === "ended" || typeof data.endedAt === "string") {
    throw new Error(LEAVE_ALREADY_ENDED);
  }

  return data;
}

function applyRoleLeaderPromotionOnLeave(uid, role, roleGates, memberUids, memberRoles) {
  if (role !== "seeker" && role !== "hider") {
    return { roleGates, clearSecretRole: null };
  }

  if (roleGates?.leaders?.[role] !== uid) {
    return { roleGates, clearSecretRole: null };
  }

  const promoted = promoteOrClearRoleLeader(roleGates, memberUids, memberRoles, role, uid);

  return {
    roleGates: promoted.roleGates,
    clearSecretRole: promoted.clearSecret ? role : null,
  };
}

function applyCastleSiegeLeaderPromotionOnLeave(uid, castleSiegeRoles, roleGates, memberUids) {
  if (!castleSiegeRoles || typeof castleSiegeRoles !== "object") {
    return { roleGates, clearSecretSeat: null };
  }

  const seat = castleSiegeRoles[uid];
  if (seat !== "teamA" && seat !== "teamB") {
    return { roleGates, clearSecretSeat: null };
  }

  if (roleGates?.leaders?.[seat] !== uid) {
    return { roleGates, clearSecretSeat: null };
  }

  const remainingCastleRoles = { ...castleSiegeRoles };
  delete remainingCastleRoles[uid];
  const promoted = promoteOrClearRoleLeader(roleGates, memberUids, remainingCastleRoles, seat, uid);

  return {
    roleGates: promoted.roleGates,
    clearSecretSeat: promoted.clearSecret ? seat : null,
  };
}

/**
 * Shared remove-member → promote role leader → optional secret clear.
 * Callers must read session + secrets before invoking, then write once.
 */
export function applyGatedMemberRemoval({ uid, data, secrets }) {
  const { memberUids, memberRoles, memberAppVersions, hostUid } = readMembershipFields(data);
  if (!memberUids.includes(uid)) {
    throw new Error(LEAVE_MEMBERSHIP_NOT_MEMBER);
  }

  const leavingRole = memberRoles[uid];
  let roleGates = {
    version: 1,
    leaders: { ...(data.roleGates?.leaders ?? {}) },
  };
  const withoutMember = removeMemberFromMaps(memberUids, memberRoles, memberAppVersions, uid);

  const leaderUpdate = applyRoleLeaderPromotionOnLeave(
    uid,
    leavingRole,
    roleGates,
    withoutMember.memberUids,
    withoutMember.memberRoles,
  );
  roleGates = leaderUpdate.roleGates;

  const castleLeaderUpdate = applyCastleSiegeLeaderPromotionOnLeave(
    uid,
    data.castleSiegeRoles,
    roleGates,
    withoutMember.memberUids,
  );
  roleGates = castleLeaderUpdate.roleGates;

  const sessionUpdate = {
    memberUids: withoutMember.memberUids,
    memberRoles: withoutMember.memberRoles,
    memberAppVersions: withoutMember.memberAppVersions,
    roleGates,
  };

  const secretKeysToClear = [
    leaderUpdate.clearSecretRole,
    castleLeaderUpdate.clearSecretSeat,
  ].filter((key) => typeof key === "string");

  let nextSecrets = null;
  if (secretKeysToClear.length > 0 && secrets) {
    nextSecrets = { ...secrets };
    for (const key of secretKeysToClear) {
      delete nextSecrets[key];
    }
  }

  return {
    hostUid,
    withoutMember,
    sessionUpdate,
    nextSecrets,
    clearSecretRole: leaderUpdate.clearSecretRole ?? castleLeaderUpdate.clearSecretSeat,
  };
}

export async function leaveSessionMembershipHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const data = assertActiveSession(sessionSnap);

    if (!isRoleGatedSession(data)) {
      throw new Error(LEAVE_NOT_GATED);
    }

    const secretsSnap = await tx.get(secretsRef);
    const secrets = secretsSnap.exists ? secretsSnap.data() : null;

    const removal = applyGatedMemberRemoval({ uid, data, secrets });

    if (uid === removal.hostUid) {
      throw new Error(LEAVE_NOT_HOST);
    }

    const seriesPatch = seriesPatchForPlayingMemberLeave(data, uid) ?? {};
    applyCastleSiegeRoleScrub(data, uid, seriesPatch);

    tx.update(sessionRef, { ...removal.sessionUpdate, ...seriesPatch });
    if (removal.nextSecrets != null) {
      tx.set(secretsRef, removal.nextSecrets);
    }
  });

  return { ok: true };
}

export async function leaveGatedHostSessionHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);
  let outcome = null;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const data = assertActiveSession(sessionSnap);

    if (data.hostUid !== uid) {
      throw new Error(LEAVE_NOT_HOST);
    }

    const secretsSnap = await tx.get(secretsRef);
    const secrets = secretsSnap.exists ? secretsSnap.data() : null;

    const removal = applyGatedMemberRemoval({ uid, data, secrets });

    const promotee = pickHostPromotee(
      removal.withoutMember.memberUids,
      removal.withoutMember.memberRoles,
      uid,
    );

    if (promotee == null) {
      // Solo host exit ends the session; mark series abandoned when Castle Siege.
      const abandonFields =
        data.mode === "castleSiege" && data.seriesOutcome == null
          ? { seriesOutcome: "abandoned" }
          : undefined;
      applyEndSessionInTx(tx, db, sessionRef, data, "ended_early", abandonFields);
      outcome = { action: "ended" };
      return;
    }

    const seriesPatch = seriesPatchForPlayingMemberLeave(data, uid) ?? {};
    applyCastleSiegeRoleScrub(data, uid, seriesPatch);

    tx.update(sessionRef, {
      ...removal.sessionUpdate,
      ...seriesPatch,
      hostUid: promotee,
    });
    if (removal.nextSecrets != null) {
      tx.set(secretsRef, removal.nextSecrets);
    }

    outcome = { action: "promoted", newHostUid: promotee };
  });

  return outcome;
}
