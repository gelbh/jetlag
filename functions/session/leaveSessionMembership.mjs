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
  removeMemberFromMaps,
} from "./roleGateShared.mjs";

export const LEAVE_MEMBERSHIP_NOT_MEMBER = "LEAVE_MEMBERSHIP_NOT_MEMBER";

function readMembershipFields(data) {
  const memberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter((uid) => typeof uid === "string")
    : [];
  const memberRoles =
    data.memberRoles && typeof data.memberRoles === "object"
      ? { ...data.memberRoles }
      : {};
  const memberAppVersions =
    data.memberAppVersions && typeof data.memberAppVersions === "object"
      ? { ...data.memberAppVersions }
      : {};
  const hostUid = typeof data.hostUid === "string" ? data.hostUid : "";

  return { memberUids, memberRoles, memberAppVersions, hostUid };
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

export async function leaveSessionMembershipHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const data = assertActiveSession(sessionSnap);

    if (!isRoleGatedSession(data)) {
      throw new Error("LEAVE_NOT_GATED");
    }

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

    if (uid === hostUid) {
      throw new Error(LEAVE_NOT_HOST);
    }

    tx.update(sessionRef, sessionUpdate);

    if (leaderUpdate.clearSecretRole) {
      const secretsSnap = await tx.get(secretsRef);
      if (secretsSnap.exists) {
        const secrets = { ...secretsSnap.data() };
        delete secrets[leaderUpdate.clearSecretRole];
        tx.set(secretsRef, secrets);
      }
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

    const { memberUids, memberRoles, memberAppVersions } = readMembershipFields(data);
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

    const promotee = pickHostPromotee(
      withoutMember.memberUids,
      withoutMember.memberRoles,
      uid,
    );

    if (promotee == null) {
      applyEndSessionInTx(tx, db, sessionRef, data, "ended_early");
      outcome = { action: "ended" };
      return;
    }

    const sessionUpdate = {
      hostUid: promotee,
      memberUids: withoutMember.memberUids,
      memberRoles: withoutMember.memberRoles,
      memberAppVersions: withoutMember.memberAppVersions,
      roleGates,
    };

    tx.update(sessionRef, sessionUpdate);

    if (leaderUpdate.clearSecretRole) {
      const secretsSnap = await tx.get(secretsRef);
      if (secretsSnap.exists) {
        const secrets = { ...secretsSnap.data() };
        delete secrets[leaderUpdate.clearSecretRole];
        tx.set(secretsRef, secrets);
      }
    }

    outcome = { action: "promoted", newHostUid: promotee };
  });

  return outcome;
}
