import { HttpsError } from "firebase-functions/v2/https";
import { isAdminAuth } from "../admin/adminAccess.mjs";
import {
  buildMembershipHealState,
  countMembersWithRole,
  isRoleGatedSession,
  promoteOrClearRoleLeader,
  readMembershipFields,
} from "./roleGateShared.mjs";
import {
  newRoleSecret,
  normalizeRolePasscode,
  verifyRolePasscode,
} from "./rolePasscodes.mjs";
import { sessionVersionCompatible } from "./sessionVersion.mjs";

export const JOIN_SESSION_NOT_FOUND = "JOIN_SESSION_NOT_FOUND";
export const JOIN_SESSION_ENDED = "JOIN_SESSION_ENDED";
export const JOIN_NOT_GATED = "JOIN_NOT_GATED";
export const JOIN_WRONG_PASSCODE = "JOIN_WRONG_PASSCODE";
export const JOIN_PASSCODE_REQUIRED = "JOIN_PASSCODE_REQUIRED";
export const JOIN_INCOMPATIBLE_VERSION = "JOIN_INCOMPATIBLE_VERSION";

const VALID_JOIN_ROLES = new Set(["seeker", "hider", "observer", "admin"]);

function normalizeSessionCode(code) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function sanitizeReturningMemberUid(persistedMyUid, candidate) {
  if (
    typeof persistedMyUid !== "string" ||
    persistedMyUid.length === 0 ||
    typeof candidate !== "string" ||
    candidate.length === 0
  ) {
    return undefined;
  }

  return persistedMyUid === candidate ? candidate : undefined;
}

function applyLeaderPromotionOnRoleSwitch({
  uid,
  currentRole,
  roleGates,
  memberUids,
  memberRoles,
}) {
  if (currentRole !== "seeker" && currentRole !== "hider") {
    return { roleGates, clearSecret: false };
  }

  if (roleGates?.leaders?.[currentRole] !== uid) {
    return { roleGates, clearSecret: false };
  }

  const promoted = promoteOrClearRoleLeader(
    roleGates,
    memberUids,
    memberRoles,
    currentRole,
    uid,
  );
  return {
    roleGates: promoted.roleGates,
    clearSecret: promoted.clearSecret,
  };
}

function assertRolePasscodeForJoin(role, memberRoles, uid, rolePasscode, secrets) {
  if (role === "observer") {
    const normalized = normalizeRolePasscode(rolePasscode ?? "");
    if (!normalized) {
      throw new Error(JOIN_PASSCODE_REQUIRED);
    }
    if (!verifyRolePasscode(secrets.observer, normalized)) {
      throw new Error(JOIN_WRONG_PASSCODE);
    }
    return { becameLeader: false, returnedPasscode: undefined, secretsPatch: null, roleGatesPatch: null };
  }

  if (role !== "seeker" && role !== "hider") {
    return { becameLeader: false, returnedPasscode: undefined, secretsPatch: null, roleGatesPatch: null };
  }

  const alreadyInRole = memberRoles[uid] === role;
  if (alreadyInRole) {
    return { becameLeader: false, returnedPasscode: undefined, secretsPatch: null, roleGatesPatch: null };
  }

  const occupied = countMembersWithRole(memberRoles, role) > 0;
  if (!occupied) {
    const secret = newRoleSecret();
    return {
      becameLeader: true,
      returnedPasscode: secret.code,
      secretsPatch: { [role]: secret },
      roleGatesPatch: { [role]: uid },
    };
  }

  const normalized = normalizeRolePasscode(rolePasscode ?? "");
  if (!normalized) {
    throw new Error(JOIN_PASSCODE_REQUIRED);
  }

  if (!verifyRolePasscode(secrets[role], normalized)) {
    throw new Error(JOIN_WRONG_PASSCODE);
  }

  return { becameLeader: false, returnedPasscode: undefined, secretsPatch: null, roleGatesPatch: null };
}

export async function joinSessionWithRoleHandler(db, auth, rawInput) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const uid = auth.uid;
  const code = normalizeSessionCode(rawInput?.code);
  const role = rawInput?.role;
  const rolePasscode = rawInput?.rolePasscode;
  const clientVersion =
    typeof rawInput?.clientVersion === "string" ? rawInput.clientVersion : "";
  const returningMemberUid = sanitizeReturningMemberUid(
    rawInput?.persistedMyUid,
    rawInput?.returningMemberUid,
  );

  if (code.length !== 4) {
    throw new HttpsError("invalid-argument", "A 4-letter session code is required.");
  }

  if (!VALID_JOIN_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid join role.");
  }

  if (role === "admin" && !isAdminAuth(auth)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const codeSnap = await db.collection("sessionCodes").doc(code).get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "Session not found.");
  }

  const codeData = codeSnap.data() ?? {};
  const sessionId =
    typeof codeData.sessionId === "string" ? codeData.sessionId : "";
  if (!sessionId) {
    throw new HttpsError("not-found", "Session not found.");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);
  let result;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(JOIN_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    if (data.status === "ended" || typeof data.endedAt === "string") {
      throw new Error(JOIN_SESSION_ENDED);
    }

    if (!isRoleGatedSession(data)) {
      throw new Error(JOIN_NOT_GATED);
    }

    if (
      role !== "admin" &&
      !sessionVersionCompatible(
        data,
        clientVersion,
        uid,
        returningMemberUid,
        role,
      )
    ) {
      throw new Error(JOIN_INCOMPATIBLE_VERSION);
    }

    const membership = readMembershipFields(data);
    let { memberUids, memberRoles, memberAppVersions, hostUid } = membership;
    let roleGates = {
      version: 1,
      leaders: { ...(data.roleGates?.leaders ?? {}) },
    };

    const secretsSnap = await tx.get(secretsRef);
    const secrets = secretsSnap.exists ? { ...secretsSnap.data() } : {};
    let secretsChanged = false;

    const currentRole = memberRoles[uid];
    if (
      currentRole &&
      currentRole !== role &&
      (currentRole === "seeker" || currentRole === "hider")
    ) {
      const switched = applyLeaderPromotionOnRoleSwitch({
        uid,
        currentRole,
        roleGates,
        memberUids,
        memberRoles,
      });
      roleGates = switched.roleGates;
      if (switched.clearSecret) {
        delete secrets[currentRole];
        secretsChanged = true;
      }
    }

    const passcodeResult =
      role === "admin"
        ? {
            becameLeader: false,
            returnedPasscode: undefined,
            secretsPatch: null,
            roleGatesPatch: null,
          }
        : assertRolePasscodeForJoin(
            role,
            memberRoles,
            uid,
            rolePasscode,
            secrets,
          );

    if (passcodeResult.secretsPatch) {
      Object.assign(secrets, passcodeResult.secretsPatch);
      secretsChanged = true;
    }
    if (passcodeResult.roleGatesPatch) {
      for (const [gateRole, leaderUid] of Object.entries(
        passcodeResult.roleGatesPatch,
      )) {
        roleGates.leaders[gateRole] = leaderUid;
      }
    }

    const heal = buildMembershipHealState({
      existingMemberUids: memberUids,
      existingRoles: memberRoles,
      existingAppVersions: memberAppVersions,
      uid,
      role,
      clientVersion,
      returningMemberUid,
      currentHostUid: hostUid,
    });

    const sessionUpdate = {
      memberUids: heal.memberUids,
      memberRoles: heal.memberRoles,
      memberAppVersions: heal.memberAppVersions,
      roleGates,
    };
    if (heal.nextHostUid != null) {
      sessionUpdate.hostUid = heal.nextHostUid;
    }

    tx.update(sessionRef, sessionUpdate);
    // Full replace so vacated role keys are deleted (merge:true would leave them).
    if (secretsChanged || Object.keys(secrets).length > 0) {
      tx.set(secretsRef, secrets);
    }

    result = {
      sessionId,
      rolePasscode: passcodeResult.returnedPasscode,
      becameLeader: passcodeResult.becameLeader,
    };
  });

  return result;
}
