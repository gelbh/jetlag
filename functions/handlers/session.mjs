import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  INIT_ALREADY_INITIALIZED,
  INIT_NOT_HOST,
  INIT_SESSION_NOT_FOUND,
  initSessionRoleGatesHandler,
} from "../session/initSessionRoleGates.mjs";
import {
  JOIN_INCOMPATIBLE_VERSION,
  JOIN_NOT_GATED,
  JOIN_PASSCODE_REQUIRED,
  JOIN_SESSION_ENDED,
  JOIN_SESSION_NOT_FOUND,
  JOIN_WRONG_PASSCODE,
  joinSessionWithRoleHandler,
} from "../session/joinSessionWithRole.mjs";
import {
  LEAVE_MEMBERSHIP_NOT_MEMBER,
  LEAVE_NOT_GATED,
  leaveSessionMembershipHandler,
} from "../session/leaveSessionMembership.mjs";
import {
  LEAVE_ALREADY_ENDED,
  LEAVE_NOT_HOST,
  LEAVE_SESSION_NOT_FOUND,
  endSessionHandler,
  leaveHostSessionHandler,
} from "../session/hostLeave.mjs";
import {
  REVEAL_NOT_AUTHORIZED,
  REVEAL_SESSION_NOT_FOUND,
  regenerateRolePasscodeHandler,
  revealRolePasscodeHandler,
} from "../session/rolePasscodeReveal.mjs";
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

function mapJoinSessionWithRoleError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === JOIN_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === JOIN_SESSION_ENDED) {
    throw new HttpsError("failed-precondition", "Session already ended.");
  }
  if (error.message === JOIN_NOT_GATED) {
    throw new HttpsError("failed-precondition", "Session uses legacy join.");
  }
  if (error.message === JOIN_WRONG_PASSCODE) {
    throw new HttpsError("permission-denied", "Wrong role code.");
  }
  if (error.message === JOIN_PASSCODE_REQUIRED) {
    throw new HttpsError("invalid-argument", "Role code is required.");
  }
  if (error.message === JOIN_INCOMPATIBLE_VERSION) {
    throw new HttpsError("failed-precondition", "App version incompatible.");
  }
  throw error;
}

function mapMembershipLeaveError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === LEAVE_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === LEAVE_ALREADY_ENDED) {
    throw new HttpsError("failed-precondition", "Session already ended.");
  }
  if (error.message === LEAVE_MEMBERSHIP_NOT_MEMBER) {
    throw new HttpsError("permission-denied", "Session membership required.");
  }
  if (error.message === LEAVE_NOT_HOST) {
    throw new HttpsError(
      "failed-precondition",
      "Host leave must use leaveHostSession.",
    );
  }
  if (error.message === LEAVE_NOT_GATED) {
    throw new HttpsError("failed-precondition", "Session uses legacy leave.");
  }
  throw error;
}

function mapRevealError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === REVEAL_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === REVEAL_NOT_AUTHORIZED) {
    throw new HttpsError("permission-denied", "Not allowed to view that role code.");
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

export const leaveSessionMembership = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
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
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
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
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
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

function requireSessionRole(request) {
  const role = request.data?.role;
  if (role !== "seeker" && role !== "hider" && role !== "observer") {
    throw new HttpsError("invalid-argument", "role is required.");
  }
  return role;
}

export const revealRolePasscode = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const role = requireSessionRole(request);
    const db = getFirestore();

    try {
      return await revealRolePasscodeHandler(db, uid, sessionId, role);
    } catch (error) {
      mapRevealError(error);
    }
  }),
);

export const regenerateRolePasscode = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const role = requireSessionRole(request);
    const db = getFirestore();

    try {
      return await regenerateRolePasscodeHandler(db, uid, sessionId, role);
    } catch (error) {
      mapRevealError(error);
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
