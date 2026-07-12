import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getSentryDsnSecret } from "../lib/sentry.mjs";
import { requireAdminAuth } from "./adminAccess.mjs";

const sentryDsnSecret = getSentryDsnSecret();

function countRoles(memberRoles) {
  const counts = { seeker: 0, hider: 0, observer: 0 };
  if (!memberRoles || typeof memberRoles !== "object") {
    return counts;
  }

  for (const role of Object.values(memberRoles)) {
    if (role === "seeker") {
      counts.seeker += 1;
    } else if (role === "hider") {
      counts.hider += 1;
    } else if (role === "observer") {
      counts.observer += 1;
    }
  }

  return counts;
}

function resolveHidingPeriodMs(session) {
  if (typeof session.hidingPeriodMinutes === "number") {
    return session.hidingPeriodMinutes * 60_000;
  }

  const gameSize = session.gameSize;
  if (gameSize === "small") {
    return 30 * 60_000;
  }
  if (gameSize === "large") {
    return 180 * 60_000;
  }

  return 60 * 60_000;
}

function timerElapsedMs(session, nowMs = Date.now()) {
  const accumulated =
    typeof session.timerAccumulatedMs === "number"
      ? session.timerAccumulatedMs
      : 0;
  const runningSince = session.timerRunningSince;
  if (typeof runningSince !== "string") {
    return accumulated;
  }

  const startedMs = Date.parse(runningSince);
  if (Number.isNaN(startedMs)) {
    return accumulated;
  }

  return accumulated + Math.max(0, nowMs - startedMs);
}

export function deriveSessionPhase(session, nowMs = Date.now()) {
  if (typeof session.endGameStartedAt === "string") {
    return "end-game-active";
  }

  if (typeof session.endGameRequestedAt === "string") {
    return "end-game-pending";
  }

  const elapsed = timerElapsedMs(session, nowMs);
  if (elapsed <= 0) {
    return "waiting";
  }

  const hidingPeriodMs = resolveHidingPeriodMs(session);
  if (elapsed < hidingPeriodMs) {
    return "hiding";
  }

  return "seek";
}

export function summarizeSession(sessionId, code, session, nowMs = Date.now()) {
  const memberUids = Array.isArray(session.memberUids)
    ? session.memberUids.filter((uid) => typeof uid === "string")
    : [];
  const roleCounts = countRoles(session.memberRoles);

  return {
    sessionId,
    code,
    hostUid: typeof session.hostUid === "string" ? session.hostUid : null,
    tier: session.tier === "premium" ? "premium" : "free",
    gameSize:
      session.gameSize === "small" ||
      session.gameSize === "medium" ||
      session.gameSize === "large"
        ? session.gameSize
        : "medium",
    createdAt:
      typeof session.createdAt === "string" ? session.createdAt : null,
    memberCount: memberUids.length,
    roleCounts,
    timerAccumulatedMs:
      typeof session.timerAccumulatedMs === "number"
        ? session.timerAccumulatedMs
        : 0,
    timerRunningSince:
      typeof session.timerRunningSince === "string"
        ? session.timerRunningSince
        : null,
    endGameStartedAt:
      typeof session.endGameStartedAt === "string"
        ? session.endGameStartedAt
        : null,
    endGameRequestedAt:
      typeof session.endGameRequestedAt === "string"
        ? session.endGameRequestedAt
        : null,
    hostAppVersion:
      typeof session.hostAppVersion === "string"
        ? session.hostAppVersion
        : null,
    hidingPeriodMinutes:
      typeof session.hidingPeriodMinutes === "number"
        ? session.hidingPeriodMinutes
        : null,
    phase: deriveSessionPhase(session, nowMs),
  };
}

export const listActiveSessions = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    const codesSnap = await db
      .collection("sessionCodes")
      .where("status", "==", "active")
      .get();

    const nowMs = Date.now();
    const sessions = [];

    for (const codeDoc of codesSnap.docs) {
      const code = codeDoc.id;
      const codeData = codeDoc.data();
      const sessionId =
        typeof codeData.sessionId === "string" ? codeData.sessionId : null;
      if (!sessionId) {
        continue;
      }

      const sessionSnap = await db.collection("sessions").doc(sessionId).get();
      if (!sessionSnap.exists) {
        continue;
      }

      const session = sessionSnap.data();
      if (session.status === "ended" || typeof session.endedAt === "string") {
        continue;
      }

      sessions.push(summarizeSession(sessionId, code, session, nowMs));
    }

    sessions.sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });

    return { sessions };
  },
);
