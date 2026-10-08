import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { endSessionHandler, leaveHostSessionHandler } from "../../session/hostLeave.mjs";
import {
  INIT_ALREADY_INITIALIZED,
  INIT_NOT_HOST,
  INIT_SESSION_NOT_FOUND,
  initSessionRoleGatesHandler,
} from "../../session/initSessionRoleGates.mjs";
import { joinSessionWithRoleHandler } from "../../session/joinSessionWithRole.mjs";
import { leaveSessionMembershipHandler } from "../../session/leaveSessionMembership.mjs";
import {
  REPAIR_ALREADY_ENDED,
  REPAIR_NOT_MEMBER,
  REPAIR_SESSION_NOT_FOUND,
  repairGhostHostHandler,
} from "../../session/repairGhostHost.mjs";
import {
  REMATCH_NOT_MEMBER,
  REMATCH_NOT_OVER,
  REMATCH_SESSION_NOT_FOUND,
  resetSessionForRematchHandler,
} from "../../session/resetSessionForRematch.mjs";
import {
  mapJoinSessionWithRoleError,
  mapLeaveError,
  mapMembershipLeaveError,
  posthogProjectApiKey,
  requireAuthSessionId,
} from "./shared.mjs";

export const resetSessionForRematch = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
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
      if (error instanceof Error && error.message === REMATCH_NOT_OVER) {
        throw new HttpsError("failed-precondition", "Round is not over.");
      }
      throw error;
    }

    return { ok: true };
  }),
);

export const leaveHostSession = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await leaveHostSessionHandler(db, uid, sessionId);
    } catch (error) {
      mapLeaveError(error);
    }
  }),
);

export const leaveSessionMembership = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await leaveSessionMembershipHandler(db, uid, sessionId);
    } catch (error) {
      mapMembershipLeaveError(error);
    }
  }),
);

export const joinSessionWithRole = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();

    try {
      return await joinSessionWithRoleHandler(db, request.auth, request.data);
    } catch (error) {
      mapJoinSessionWithRoleError(error);
    }
  }),
);

export const initSessionRoleGates = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const db = getFirestore();

    try {
      return await initSessionRoleGatesHandler(db, uid, sessionId);
    } catch (error) {
      if (error instanceof Error && error.message === INIT_SESSION_NOT_FOUND) {
        throw new HttpsError("not-found", "Session not found.");
      }
      if (error instanceof Error && error.message === INIT_NOT_HOST) {
        throw new HttpsError("permission-denied", "Only the host can do that.");
      }
      if (error instanceof Error && error.message === INIT_ALREADY_INITIALIZED) {
        throw new HttpsError("failed-precondition", "Role gates already initialized.");
      }
      throw error;
    }
  }),
);

export const endSession = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
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
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
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
