import { HttpsError } from "firebase-functions/v2/https";
import {
  buildMembershipHealState,
  countMembersWithRole,
  isRoleGatedSession,
  promoteOrClearRoleLeader,
  readMembershipFields,
} from "./roleGateShared.mjs";

export const JOIN_REQUEST_TTL_MS = 10 * 60 * 1000;

export const JOIN_REQ_SESSION_NOT_FOUND = "JOIN_REQ_SESSION_NOT_FOUND";
export const JOIN_REQ_SESSION_ENDED = "JOIN_REQ_SESSION_ENDED";
export const JOIN_REQ_NOT_GATED = "JOIN_REQ_NOT_GATED";
export const JOIN_REQ_SIDE_EMPTY = "JOIN_REQ_SIDE_EMPTY";
export const JOIN_REQ_INVALID_ROLE = "JOIN_REQ_INVALID_ROLE";
export const JOIN_REQ_NOT_FOUND = "JOIN_REQ_NOT_FOUND";
export const JOIN_REQ_NOT_PENDING = "JOIN_REQ_NOT_PENDING";
export const JOIN_REQ_EXPIRED = "JOIN_REQ_EXPIRED";
export const JOIN_REQ_NOT_REQUESTER = "JOIN_REQ_NOT_REQUESTER";
export const JOIN_REQ_NOT_AUTHORIZED = "JOIN_REQ_NOT_AUTHORIZED";
export const JOIN_REQ_INVALID_DECISION = "JOIN_REQ_INVALID_DECISION";

const VALID_JOIN_REQUEST_ROLES = new Set(["seeker", "hider", "observer"]);

export function computeJoinRequestExpiresAt(createdAtMs) {
  return new Date(createdAtMs + JOIN_REQUEST_TTL_MS).toISOString();
}

export function isJoinRequestExpired(request, nowMs) {
  if (request?.status !== "pending") {
    return false;
  }
  return nowMs >= Date.parse(request.expiresAt);
}

export function buildJoinRequestIdentityLabel(input) {
  const username =
    typeof input?.username === "string" ? input.username.trim() : "";
  if (username) {
    return username;
  }

  const email = typeof input?.email === "string" ? input.email.trim() : "";
  if (email) {
    return email;
  }

  return "Anonymous player";
}

function assertAuth(auth) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  return auth.uid;
}

function readSessionId(rawInput) {
  const sessionId =
    typeof rawInput?.sessionId === "string" ? rawInput.sessionId.trim() : "";
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }
  return sessionId;
}

function readRequestId(rawInput) {
  const requestId =
    typeof rawInput?.requestId === "string" ? rawInput.requestId.trim() : "";
  if (!requestId) {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }
  return requestId;
}

function readJoinRole(rawInput) {
  const role = rawInput?.role;
  if (!VALID_JOIN_REQUEST_ROLES.has(role)) {
    throw new Error(JOIN_REQ_INVALID_ROLE);
  }
  return role;
}

function assertSessionJoinable(data) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    throw new Error(JOIN_REQ_SESSION_ENDED);
  }
  if (!isRoleGatedSession(data)) {
    throw new Error(JOIN_REQ_NOT_GATED);
  }
}

function assertCanApproveRole(data, uid, role) {
  if (role === "observer") {
    if (data.hostUid !== uid) {
      throw new Error(JOIN_REQ_NOT_AUTHORIZED);
    }
    return;
  }

  const leaders =
    data.roleGates && typeof data.roleGates === "object"
      ? data.roleGates.leaders ?? {}
      : {};
  const memberRole =
    data.memberRoles && typeof data.memberRoles === "object"
      ? data.memberRoles[uid]
      : undefined;

  if (leaders[role] !== uid || memberRole !== role) {
    throw new Error(JOIN_REQ_NOT_AUTHORIZED);
  }
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

async function resolveIdentityLabel(db, authAdmin, uid) {
  let username = null;
  let email = null;

  const profileSnap = await db
    .collection("users")
    .doc(uid)
    .collection("profile")
    .doc("main")
    .get();
  if (profileSnap.exists) {
    const profile = profileSnap.data() ?? {};
    if (typeof profile.username === "string") {
      username = profile.username;
    }
  }

  if (authAdmin && typeof authAdmin.getUser === "function") {
    try {
      const user = await authAdmin.getUser(uid);
      if (typeof user?.email === "string") {
        email = user.email;
      }
    } catch {
      // Anonymous / missing Auth record — fall through to label defaults.
    }
  }

  return buildJoinRequestIdentityLabel({ username, email });
}

export async function requestRoleJoinHandler(
  db,
  auth,
  authAdmin,
  rawInput,
  nowMs = Date.now(),
) {
  const uid = assertAuth(auth);
  const sessionId = readSessionId(rawInput);
  const role = readJoinRole(rawInput);
  const clientVersion =
    typeof rawInput?.clientVersion === "string" ? rawInput.clientVersion : "";

  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new Error(JOIN_REQ_SESSION_NOT_FOUND);
  }

  const data = sessionSnap.data() ?? {};
  assertSessionJoinable(data);

  const { memberRoles } = readMembershipFields(data);
  if (role === "seeker" || role === "hider") {
    if (countMembersWithRole(memberRoles, role) === 0) {
      throw new Error(JOIN_REQ_SIDE_EMPTY);
    }
  }

  const identityLabel = await resolveIdentityLabel(db, authAdmin, uid);
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = computeJoinRequestExpiresAt(nowMs);
  const requestRef = sessionRef.collection("joinRequests").doc();

  await requestRef.set({
    requesterUid: uid,
    role,
    status: "pending",
    identityLabel,
    createdAt,
    expiresAt,
    clientVersion,
    sessionId,
  });

  return { requestId: requestRef.id, expiresAt };
}

export async function cancelRoleJoinRequestHandler(
  db,
  auth,
  rawInput,
  nowMs = Date.now(),
) {
  const uid = assertAuth(auth);
  const sessionId = readSessionId(rawInput);
  const requestId = readRequestId(rawInput);

  const requestRef = db
    .collection("sessions")
    .doc(sessionId)
    .collection("joinRequests")
    .doc(requestId);

  await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) {
      throw new Error(JOIN_REQ_NOT_FOUND);
    }

    const request = requestSnap.data() ?? {};
    if (request.requesterUid !== uid) {
      throw new Error(JOIN_REQ_NOT_REQUESTER);
    }

    if (request.status !== "pending") {
      throw new Error(JOIN_REQ_NOT_PENDING);
    }

    if (isJoinRequestExpired(request, nowMs)) {
      tx.update(requestRef, {
        status: "expired",
        resolvedAt: new Date(nowMs).toISOString(),
      });
      throw new Error(JOIN_REQ_EXPIRED);
    }

    tx.update(requestRef, {
      status: "cancelled",
      resolvedAt: new Date(nowMs).toISOString(),
      resolvedByUid: uid,
    });
  });

  return { ok: true };
}

export async function resolveRoleJoinRequestHandler(
  db,
  auth,
  rawInput,
  nowMs = Date.now(),
) {
  const uid = assertAuth(auth);
  const sessionId = readSessionId(rawInput);
  const requestId = readRequestId(rawInput);
  const decision = rawInput?.decision;

  if (decision !== "accept" && decision !== "decline") {
    throw new Error(JOIN_REQ_INVALID_DECISION);
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);
  const requestRef = sessionRef.collection("joinRequests").doc(requestId);

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(JOIN_REQ_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    assertSessionJoinable(data);

    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) {
      throw new Error(JOIN_REQ_NOT_FOUND);
    }

    const request = requestSnap.data() ?? {};
    const role = request.role;
    if (!VALID_JOIN_REQUEST_ROLES.has(role)) {
      throw new Error(JOIN_REQ_INVALID_ROLE);
    }

    assertCanApproveRole(data, uid, role);

    if (request.status !== "pending") {
      throw new Error(JOIN_REQ_NOT_PENDING);
    }

    if (isJoinRequestExpired(request, nowMs)) {
      tx.update(requestRef, {
        status: "expired",
        resolvedAt: new Date(nowMs).toISOString(),
      });
      throw new Error(JOIN_REQ_EXPIRED);
    }

    const resolvedAt = new Date(nowMs).toISOString();

    if (decision === "decline") {
      tx.update(requestRef, {
        status: "declined",
        resolvedAt,
        resolvedByUid: uid,
      });
      return;
    }

    const membership = readMembershipFields(data);
    let { memberUids, memberRoles, memberAppVersions, hostUid } = membership;
    let roleGates = {
      version: 1,
      leaders: { ...(data.roleGates?.leaders ?? {}) },
    };

    const requesterUid = request.requesterUid;
    const clientVersion =
      typeof request.clientVersion === "string" ? request.clientVersion : "";

    const secretsSnap = await tx.get(secretsRef);
    const secrets = secretsSnap.exists ? { ...secretsSnap.data() } : {};
    let secretsChanged = false;

    const currentRole = memberRoles[requesterUid];
    if (
      currentRole &&
      currentRole !== role &&
      (currentRole === "seeker" || currentRole === "hider")
    ) {
      const switched = applyLeaderPromotionOnRoleSwitch({
        uid: requesterUid,
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

    // Accept never mints secrets — side must already be occupied (or observer).
    const heal = buildMembershipHealState({
      existingMemberUids: memberUids,
      existingRoles: memberRoles,
      existingAppVersions: memberAppVersions,
      uid: requesterUid,
      role,
      clientVersion,
      returningMemberUid: undefined,
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
    if (secretsChanged) {
      tx.set(secretsRef, secrets);
    }

    tx.update(requestRef, {
      status: "accepted",
      resolvedAt,
      resolvedByUid: uid,
    });
  });

  return { ok: true };
}
