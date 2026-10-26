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
  let codeStamp = null;

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
    // Castle Siege: classic memberRoles host is always observer; play seat is castleSiegeRoles.
    // Classic create still requires seeker/hider.
    const isCastleSiege = data.mode === "castleSiege";
    if (isCastleSiege) {
      if (hostRole !== "observer") {
        throw new HttpsError(
          "failed-precondition",
          "Castle Siege host classic role must be observer.",
        );
      }
    } else if (hostRole !== "seeker" && hostRole !== "hider") {
      throw new HttpsError("failed-precondition", "Host player role must be seeker or hider.");
    }

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
      if (typeof data.code === "string" && data.code.length === 4) {
        codeStamp = {
          code: data.code,
          seriesLength: data.seriesLength === 3 ? 3 : 1,
        };
      }
    } else {
      roleGates = isRoleGatedSession(data) ? data.roleGates : buildRoleGatesForHost(uid, hostRole);
      secrets = buildInitialRoleSecrets(hostRole);
      observerPasscode = secrets.observer.code;
      rolePasscode = secrets[hostRole]?.code;
    }

    tx.update(sessionRef, { roleGates });
    tx.set(secretsRef, secrets);
  });

  // Public join preview reads sessionCodes; stamp mode without role secrets.
  // Client create also writes these; this covers older creates / missed stamps.
  if (codeStamp) {
    await db
      .collection("sessionCodes")
      .doc(codeStamp.code)
      .set({ mode: "castleSiege", seriesLength: codeStamp.seriesLength }, { merge: true });
  }

  return { observerPasscode, rolePasscode };
}
