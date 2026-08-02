import { HttpsError } from "firebase-functions/v2/https";
import {
  buildInitialRoleSecrets,
  buildRoleGatesForHost,
  isRoleGatedSession,
} from "./roleGateShared.mjs";

export const INIT_SESSION_NOT_FOUND = "INIT_SESSION_NOT_FOUND";
export const INIT_NOT_HOST = "INIT_NOT_HOST";
export const INIT_ALREADY_INITIALIZED = "INIT_ALREADY_INITIALIZED";

export async function initSessionRoleGatesHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const secretsRef = db.collection("sessionRoleSecrets").doc(sessionId);
  let observerPasscode;
  let rolePasscode;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(INIT_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    if (data.hostUid !== uid) {
      throw new Error(INIT_NOT_HOST);
    }

    const secretsSnap = await tx.get(secretsRef);
    if (secretsSnap.exists) {
      throw new Error(INIT_ALREADY_INITIALIZED);
    }

    const hostRole = data.memberRoles?.[uid];
    if (hostRole !== "seeker" && hostRole !== "hider") {
      throw new HttpsError(
        "failed-precondition",
        "Host player role must be seeker or hider.",
      );
    }

    const roleGates = isRoleGatedSession(data)
      ? data.roleGates
      : buildRoleGatesForHost(uid, hostRole);
    const secrets = buildInitialRoleSecrets(hostRole);

    observerPasscode = secrets.observer.code;
    rolePasscode = secrets[hostRole]?.code;

    tx.update(sessionRef, { roleGates });
    tx.set(secretsRef, secrets);
  });

  return { observerPasscode, rolePasscode };
}
