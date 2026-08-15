import { HttpsError } from "firebase-functions/v2/https";
import { getSentryDsnSecret } from "../../lib/sentry.mjs";
import {
  JOIN_INCOMPATIBLE_VERSION,
  JOIN_NOT_GATED,
  JOIN_PASSCODE_REQUIRED,
  JOIN_SESSION_ENDED,
  JOIN_SESSION_NOT_FOUND,
  JOIN_WRONG_PASSCODE,
} from "../../session/joinSessionWithRole.mjs";
import {
  LEAVE_MEMBERSHIP_NOT_MEMBER,
  LEAVE_NOT_GATED,
} from "../../session/leaveSessionMembership.mjs";
import {
  LEAVE_ALREADY_ENDED,
  LEAVE_NOT_HOST,
  LEAVE_SESSION_NOT_FOUND,
} from "../../session/hostLeave.mjs";
import {
  REVEAL_NOT_AUTHORIZED,
  REVEAL_SESSION_NOT_FOUND,
} from "../../session/rolePasscodeReveal.mjs";
import {
  JOIN_REQ_EXPIRED,
  JOIN_REQ_INVALID_DECISION,
  JOIN_REQ_INVALID_ROLE,
  JOIN_REQ_NOT_AUTHORIZED,
  JOIN_REQ_NOT_FOUND,
  JOIN_REQ_NOT_GATED,
  JOIN_REQ_NOT_PENDING,
  JOIN_REQ_NOT_REQUESTER,
  JOIN_REQ_SESSION_ENDED,
  JOIN_REQ_SESSION_NOT_FOUND,
  JOIN_REQ_SIDE_EMPTY,
} from "../../session/joinRequest.mjs";
import {
  MOVE_TIMER_INVALID_ACTION,
  MOVE_TIMER_NOT_HIDER,
  MOVE_TIMER_SESSION_ENDED,
  MOVE_TIMER_SESSION_NOT_FOUND,
} from "../../session/controlSessionTimerForMove.mjs";

export const sentryDsnSecret = getSentryDsnSecret();

/** Human-facing HttpsError messages for expected join/role UX (Sentry allowlist SoT). */
export const HTTPS_MSG_WRONG_ROLE_CODE = "Wrong role code.";
export const HTTPS_MSG_ROLE_CODE_REQUIRED = "Role code is required.";
export const HTTPS_MSG_APP_VERSION_INCOMPATIBLE = "App version incompatible.";
export const HTTPS_MSG_JOIN_SIDE_EMPTY =
  "Join without a request — this side is empty.";
export const HTTPS_MSG_JOIN_NOT_PENDING = "Join request is not pending.";
export const HTTPS_MSG_JOIN_EXPIRED = "Join request expired.";
export const HTTPS_MSG_INVALID_JOIN_REQUEST = "Invalid join request.";
export const HTTPS_MSG_JOIN_NOT_ALLOWED =
  "Not allowed for this join request.";
export const HTTPS_MSG_LEGACY_JOIN = "Session uses legacy join.";

/**
 * Expected session join/role UX HttpsError keys (`code:message`) for Sentry.
 * Keep in sync with mapJoinSessionWithRoleError / mapJoinRequestError throws.
 */
export const EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS = [
  `permission-denied:${HTTPS_MSG_WRONG_ROLE_CODE}`,
  `invalid-argument:${HTTPS_MSG_ROLE_CODE_REQUIRED}`,
  `failed-precondition:${HTTPS_MSG_APP_VERSION_INCOMPATIBLE}`,
  `failed-precondition:${HTTPS_MSG_JOIN_SIDE_EMPTY}`,
  `failed-precondition:${HTTPS_MSG_JOIN_NOT_PENDING}`,
  `failed-precondition:${HTTPS_MSG_JOIN_EXPIRED}`,
  `invalid-argument:${HTTPS_MSG_INVALID_JOIN_REQUEST}`,
  `permission-denied:${HTTPS_MSG_JOIN_NOT_ALLOWED}`,
  `failed-precondition:${HTTPS_MSG_LEGACY_JOIN}`,
];

export function requireAuthSessionId(request) {
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

export function requireSessionRole(request) {
  const role = request.data?.role;
  if (role !== "seeker" && role !== "hider" && role !== "observer") {
    throw new HttpsError("invalid-argument", "role is required.");
  }
  return role;
}

export function mapLeaveError(error) {
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

export function mapJoinSessionWithRoleError(error) {
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
    throw new HttpsError("failed-precondition", HTTPS_MSG_LEGACY_JOIN);
  }
  if (error.message === JOIN_WRONG_PASSCODE) {
    throw new HttpsError("permission-denied", HTTPS_MSG_WRONG_ROLE_CODE);
  }
  if (error.message === JOIN_PASSCODE_REQUIRED) {
    throw new HttpsError("invalid-argument", HTTPS_MSG_ROLE_CODE_REQUIRED);
  }
  if (error.message === JOIN_INCOMPATIBLE_VERSION) {
    throw new HttpsError(
      "failed-precondition",
      HTTPS_MSG_APP_VERSION_INCOMPATIBLE,
    );
  }
  throw error;
}

export function mapMembershipLeaveError(error) {
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

export function mapRevealError(error) {
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

export function mapJoinRequestError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === JOIN_REQ_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === JOIN_REQ_NOT_FOUND) {
    throw new HttpsError("not-found", "Join request not found.");
  }
  if (error.message === JOIN_REQ_SESSION_ENDED) {
    throw new HttpsError("failed-precondition", "Session already ended.");
  }
  if (error.message === JOIN_REQ_NOT_GATED) {
    throw new HttpsError("failed-precondition", HTTPS_MSG_LEGACY_JOIN);
  }
  if (error.message === JOIN_REQ_SIDE_EMPTY) {
    throw new HttpsError("failed-precondition", HTTPS_MSG_JOIN_SIDE_EMPTY);
  }
  if (error.message === JOIN_REQ_INVALID_ROLE || error.message === JOIN_REQ_INVALID_DECISION) {
    throw new HttpsError("invalid-argument", HTTPS_MSG_INVALID_JOIN_REQUEST);
  }
  if (
    error.message === JOIN_REQ_NOT_AUTHORIZED ||
    error.message === JOIN_REQ_NOT_REQUESTER
  ) {
    throw new HttpsError("permission-denied", HTTPS_MSG_JOIN_NOT_ALLOWED);
  }
  if (error.message === JOIN_REQ_NOT_PENDING) {
    throw new HttpsError("failed-precondition", HTTPS_MSG_JOIN_NOT_PENDING);
  }
  if (error.message === JOIN_REQ_EXPIRED) {
    throw new HttpsError("failed-precondition", HTTPS_MSG_JOIN_EXPIRED);
  }
  throw error;
}

export function mapMoveTimerError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  if (error.message === MOVE_TIMER_SESSION_NOT_FOUND) {
    throw new HttpsError("not-found", "Session not found.");
  }
  if (error.message === MOVE_TIMER_SESSION_ENDED) {
    throw new HttpsError("failed-precondition", "Session already ended.");
  }
  if (error.message === MOVE_TIMER_NOT_HIDER) {
    throw new HttpsError(
      "permission-denied",
      "Only a confirmed hider can control the timer for Move.",
    );
  }
  if (error.message === MOVE_TIMER_INVALID_ACTION) {
    throw new HttpsError("invalid-argument", "action must be pause or resume.");
  }
  throw error;
}
