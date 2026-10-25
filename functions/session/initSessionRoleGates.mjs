import { HttpsError } from "firebase-functions/v2/https";
import {
  buildInitialRoleSecrets,
  buildRoleGatesForCastleSiegeHost,
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
    // Castle Siege stamps classic memberRoles host as observer (play role lives in
    // castleSiegeRoles). Classic create still requires seeker/hider.
    const castleSiegeObserverHost = data.mode === "castleSiege" && hostRole === "observer";
    if (hostRole !== "seeker" && hostRole !== "hider" && !castleSiegeObserverHost) {
      throw new HttpsError("failed-precondition", "Host player role must be seeker or hider.");
    }

    const isCastleSiege = data.mode === "castleSiege";
    let roleGates;
    let secrets;

    if (isCastleSiege) {
      const hostSeat = data.castleSiegeRoles?.[uid];
      if (hostSeat !== "teamA" && hostSeat !== "teamB") {
        throw new HttpsError(
          "failed-precondition",
          "Castle Siege host must be on team A or team B.",
        );
      }
      roleGates = isRoleGatedSession(data)
        ? data.roleGates
        : buildRoleGatesForCastleSiegeHost(uid, hostSeat);
      secrets = buildInitialRoleSecrets(hostRole, { mode: "castleSiege" });
      observerPasscode = secrets.observer.code;
      rolePasscode = secrets[hostSeat].code;
    } else {
      roleGates = isRoleGatedSession(data) ? data.roleGates : buildRoleGatesForHost(uid, hostRole);
      secrets = buildInitialRoleSecrets(hostRole);
      observerPasscode = secrets.observer.code;
      rolePasscode = secrets[hostRole]?.code;
    }

    tx.update(sessionRef, { roleGates });
    tx.set(secretsRef, secrets);
  });

  return { observerPasscode, rolePasscode };
}
