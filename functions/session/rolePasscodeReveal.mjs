import { HttpsError } from "firebase-functions/v2/https";
import {
  generateRolePasscode,
  newRoleSecret,
  normalizeRolePasscode,
  verifyRolePasscode,
} from "./rolePasscodes.mjs";

export const REVEAL_SESSION_NOT_FOUND = "REVEAL_SESSION_NOT_FOUND";
export const REVEAL_NOT_AUTHORIZED = "REVEAL_NOT_AUTHORIZED";

const VALID_REVEAL_ROLES = new Set(["seeker", "hider", "observer"]);

function readSessionRole(data, uid) {
  const hostUid = typeof data.hostUid === "string" ? data.hostUid : "";
  const memberRole =
    data.memberRoles && typeof data.memberRoles === "object"
      ? data.memberRoles[uid]
      : undefined;
  const leaders =
    data.roleGates && typeof data.roleGates === "object"
      ? data.roleGates.leaders ?? {}
      : {};

  return { hostUid, memberRole, leaders };
}

function assertRevealAuthorized(data, uid, role) {
  const { hostUid, memberRole, leaders } = readSessionRole(data, uid);

  if (role === "observer") {
    if (hostUid !== uid) {
      throw new Error(REVEAL_NOT_AUTHORIZED);
    }
    return;
  }

  if (role !== "seeker" && role !== "hider") {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  if (leaders[role] !== uid || memberRole !== role) {
    throw new Error(REVEAL_NOT_AUTHORIZED);
  }
}

export async function revealRolePasscodeHandler(db, uid, sessionId, role) {
  if (!VALID_REVEAL_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);

  // Overlap session + secrets reads — auth still gates on session before return.
  const secretsPromise = secretsRef.get();
  const absorbSecretsRejection = () => {
    void secretsPromise.catch(() => {});
  };

  try {
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      throw new Error(REVEAL_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    assertRevealAuthorized(data, uid, role);

    const secretsSnap = await secretsPromise;
    const secret = secretsSnap.exists ? secretsSnap.data()?.[role] : null;
    const code = typeof secret?.code === "string" ? secret.code : null;
    if (!code) {
      throw new HttpsError("failed-precondition", "Role passcode is not set.");
    }

    return { role, rolePasscode: code };
  } catch (error) {
    absorbSecretsRejection();
    throw error;
  }
}

export async function regenerateRolePasscodeHandler(db, uid, sessionId, role) {
  if (!VALID_REVEAL_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);
  let rolePasscode;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(REVEAL_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    assertRevealAuthorized(data, uid, role);

    const secretsSnap = await tx.get(secretsRef);
    const secrets = secretsSnap.exists ? { ...secretsSnap.data() } : {};
    const nextSecret = newRoleSecret();
    secrets[role] = nextSecret;
    rolePasscode = nextSecret.code;

    tx.set(secretsRef, secrets, { merge: true });
  });

  return { role, rolePasscode };
}

export { verifyRolePasscode, generateRolePasscode, normalizeRolePasscode };
