import { FieldValue } from "firebase-admin/firestore";
import { readMembershipFields } from "./roleGateShared.mjs";

export const MOVE_TIMER_SESSION_NOT_FOUND = "MOVE_TIMER_SESSION_NOT_FOUND";
export const MOVE_TIMER_SESSION_ENDED = "MOVE_TIMER_SESSION_ENDED";
export const MOVE_TIMER_NOT_HIDER = "MOVE_TIMER_NOT_HIDER";
export const MOVE_TIMER_INVALID_ACTION = "MOVE_TIMER_INVALID_ACTION";

/**
 * Server-trusted timer pause/resume for confirmed hiders playing Move.
 * Client rules only allow host timer writes (`isTimerHostUpdate`); non-host
 * hiders must use this callable so Play Move actually pauses for everyone.
 *
 * Threat model: any confirmed hider on the session may pause/resume the
 * shared timer. That matches Move card trust (hider already controls zone
 * writes). Do not widen to seekers/observers without stronger authz.
 */
export async function controlSessionTimerForMoveHandler(
  db,
  uid,
  sessionId,
  action,
) {
  if (action !== "pause" && action !== "resume") {
    throw new Error(MOVE_TIMER_INVALID_ACTION);
  }

  const sessionRef = db.collection("sessions").doc(sessionId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) {
      throw new Error(MOVE_TIMER_SESSION_NOT_FOUND);
    }

    const data = snap.data() ?? {};
    if (data.status === "ended" || typeof data.endedAt === "string") {
      throw new Error(MOVE_TIMER_SESSION_ENDED);
    }

    const { memberUids, memberRoles } = readMembershipFields(data);
    if (!memberUids.includes(uid) || memberRoles[uid] !== "hider") {
      throw new Error(MOVE_TIMER_NOT_HIDER);
    }

    const accumulatedMs =
      typeof data.timerAccumulatedMs === "number" &&
      Number.isFinite(data.timerAccumulatedMs)
        ? Math.max(0, data.timerAccumulatedMs)
        : 0;
    const runningSinceRaw = data.timerRunningSince;
    const runningSinceMs =
      typeof runningSinceRaw === "string" ? Date.parse(runningSinceRaw) : NaN;
    const isRunning = Number.isFinite(runningSinceMs);

    if (action === "pause") {
      if (!isRunning) {
        return { ok: true, action: "pause", noop: true };
      }

      const now = Date.now();
      const nextAccumulated = Math.max(0, accumulatedMs + (now - runningSinceMs));
      tx.update(sessionRef, {
        timerAccumulatedMs: nextAccumulated,
        timerRunningSince: FieldValue.delete(),
      });
      return { ok: true, action: "pause", noop: false };
    }

    if (isRunning) {
      return { ok: true, action: "resume", noop: true };
    }

    tx.update(sessionRef, {
      timerAccumulatedMs: accumulatedMs,
      timerRunningSince: new Date().toISOString(),
    });
    return { ok: true, action: "resume", noop: false };
  });
}
