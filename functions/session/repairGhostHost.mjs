import { pickHostPromotee } from "./pickHostPromotee.mjs";

export const REPAIR_SESSION_NOT_FOUND = "REPAIR_SESSION_NOT_FOUND";
export const REPAIR_ALREADY_ENDED = "REPAIR_ALREADY_ENDED";
export const REPAIR_NOT_MEMBER = "REPAIR_NOT_MEMBER";

/**
 * When hostUid is missing from memberUids (auth-drift heal), promote a member.
 * Caller must be a current member. Uses Admin SDK — clients must not write hostUid.
 */
export async function repairGhostHostHandler(db, uid, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  let outcome = null;

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error(REPAIR_SESSION_NOT_FOUND);
    }

    const data = sessionSnap.data() ?? {};
    if (data.status === "ended" || typeof data.endedAt === "string") {
      throw new Error(REPAIR_ALREADY_ENDED);
    }

    const memberUids = Array.isArray(data.memberUids) ? data.memberUids : [];
    if (!memberUids.includes(uid)) {
      throw new Error(REPAIR_NOT_MEMBER);
    }

    const hostUid = typeof data.hostUid === "string" ? data.hostUid : "";
    if (hostUid.length > 0 && memberUids.includes(hostUid)) {
      outcome = { action: "noop", hostUid };
      return;
    }

    const promotee = pickHostPromotee(memberUids, data.memberRoles, hostUid);
    if (promotee == null) {
      outcome = { action: "noop", hostUid };
      return;
    }

    tx.update(sessionRef, { hostUid: promotee });
    outcome = { action: "repaired", newHostUid: promotee };
  });

  return outcome;
}
