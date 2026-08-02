import { applyEndSessionInTx } from "./endSessionCanonical.mjs";
import {
  LEAVE_ALREADY_ENDED,
  LEAVE_NOT_HOST,
  LEAVE_SESSION_NOT_FOUND,
} from "./hostLeave.mjs";
import { pickHostPromotee } from "./pickHostPromotee.mjs";
import {
  isRoleGatedSession,
  promoteOrClearRoleLeader,
  readMembershipFields,
  removeMemberFromMaps,
} from "./roleGateShared.mjs";

export const LEAVE_MEMBERSHIP_NOT_MEMBER = "LEAVE_MEMBERSHIP_NOT_MEMBER";
export const LEAVE_NOT_GATED = "LEAVE_NOT_GATED";

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

  const promoted = promoteOrClearRoleLeader(
    roleGates,
    memberUids,
    memberRoles,
    role,
    uid,
  );

  return {
    roleGates: promoted.roleGates,
    clearSecretRole: promoted.clearSecret ? role : null,
  };
}

/**
 * Shared remove-member → promote role leader → optional secret clear.
 * Callers must read session + secrets before invoking, then write once.
 */
export function applyGatedMemberRemoval({
  uid,
  data,
  secrets,
}) {
  const { memberUids, memberRoles, memberAppVersions, hostUid } =
    readMembershipFields(data);
  if (!memberUids.includes(uid)) {
    throw new Error(LEAVE_MEMBERSHIP_NOT_MEMBER);
  }

  const leavingRole = memberRoles[uid];
  let roleGates = {
    version: 1,
    leaders: { ...(data.roleGates?.leaders ?? {}) },
  };
  const withoutMember = removeMemberFromMaps(
    memberUids,
    memberRoles,
    memberAppVersions,
    uid,
  );

  const leaderUpdate = applyRoleLeaderPromotionOnLeave(
    uid,
    leavingRole,
    roleGates,
    withoutMember.memberUids,
    withoutMember.memberRoles,
  );
  roleGates = leaderUpdate.roleGates;

  const sessionUpdate = {
    memberUids: withoutMember.memberUids,
    memberRoles: withoutMember.memberRoles,
    memberAppVersions: withoutMember.memberAppVersions,
    roleGates,
  };

  let nextSecrets = null;
  if (leaderUpdate.clearSecretRole && secrets) {
    nextSecrets = { ...secrets };
    delete nextSecrets[leaderUpdate.clearSecretRole];
  }

  return {
    hostUid,
    withoutMember,
    sessionUpdate,
    nextSecrets,
    clearSecretRole: leaderUpdate.clearSecretRole,
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

    tx.update(sessionRef, removal.sessionUpdate);
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
      applyEndSessionInTx(tx, db, sessionRef, data, "ended_early");
      outcome = { action: "ended" };
      return;
    }

    tx.update(sessionRef, {
      ...removal.sessionUpdate,
      hostUid: promotee,
    });
    if (removal.nextSecrets != null) {
      tx.set(secretsRef, removal.nextSecrets);
    }

    outcome = { action: "promoted", newHostUid: promotee };
  });

  return outcome;
}
