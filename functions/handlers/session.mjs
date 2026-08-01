import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  LEAVE_ALREADY_ENDED,
  LEAVE_NOT_HOST,
  LEAVE_SESSION_NOT_FOUND,
  endSessionHandler,
  leaveHostSessionHandler,
} from "../session/hostLeave.mjs";
import {
  REMATCH_NOT_MEMBER,
  REMATCH_SESSION_NOT_FOUND,
  resetSessionForRematchHandler,
} from "../session/resetSessionForRematch.mjs";
import {
  REPAIR_ALREADY_ENDED,
  REPAIR_NOT_MEMBER,
  REPAIR_SESSION_NOT_FOUND,
  repairGhostHostHandler,
} from "../session/repairGhostHost.mjs";

const sentryDsnSecret = getSentryDsnSecret();

function requireAuthSessionId(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const sessionId =
    typeof request.data?.sessionId === "string" ? request.data.sessionId : "";

  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }

  return { uid: request.auth.uid, sessionId };
}

function mapLeaveError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === LEAVE_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === LEAVE_NOT_HOST) {
    throw new HttpsError("permission-denied", "Only the host can do that.");
  }
  if (error.message === LEAVE_ALREADY_ENDED) {
    throw new HttpsError("failed-precondition", "Session already ended.");
  }
  throw error;
}

export const resetSessionForRematch = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      await resetSessionForRematchHandler(db, uid, sessionId);
    } catch (error) {
      if (error instanceof Error && error.message === REMATCH_SESSION_NOT_FOUND) {
        throw new HttpsError("not-found", "Session not found.");
      }
      if (error instanceof Error && error.message === REMATCH_NOT_MEMBER) {
        throw new HttpsError("permission-denied", "Session membership required.");
      }
      throw error;
    }

    return { ok: true };
  }),
);

export const leaveHostSession = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await leaveHostSessionHandler(db, uid, sessionId);
    } catch (error) {
      mapLeaveError(error);
    }
  }),
);

export const endSession = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await endSessionHandler(db, uid, sessionId);
    } catch (error) {
      mapLeaveError(error);
    }
  }),
);

export const repairGhostHost = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await repairGhostHostHandler(db, uid, sessionId);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      if (error.message === REPAIR_SESSION_NOT_FOUND) {
        throw new HttpsError("not-found", "Session not found.");
      }
      if (error.message === REPAIR_NOT_MEMBER) {
        throw new HttpsError("permission-denied", "Session membership required.");
      }
      if (error.message === REPAIR_ALREADY_ENDED) {
        throw new HttpsError("failed-precondition", "Session already ended.");
      }
      throw error;
    }
  }),
);
