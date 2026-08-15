/** Human-facing HttpsError messages for expected join/role UX (Sentry allowlist SoT). */
export const HTTPS_MSG_WRONG_ROLE_CODE = "Wrong role code.";
export const HTTPS_MSG_ROLE_CODE_REQUIRED = "Role code is required.";
export const HTTPS_MSG_APP_VERSION_INCOMPATIBLE = "App version incompatible.";
export const HTTPS_MSG_CLIENT_UPDATE_REQUIRED = "Client update required.";
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
  `failed-precondition:${HTTPS_MSG_CLIENT_UPDATE_REQUIRED}`,
  `failed-precondition:${HTTPS_MSG_JOIN_SIDE_EMPTY}`,
  `failed-precondition:${HTTPS_MSG_JOIN_NOT_PENDING}`,
  `failed-precondition:${HTTPS_MSG_JOIN_EXPIRED}`,
  `invalid-argument:${HTTPS_MSG_INVALID_JOIN_REQUEST}`,
  `permission-denied:${HTTPS_MSG_JOIN_NOT_ALLOWED}`,
  `failed-precondition:${HTTPS_MSG_LEGACY_JOIN}`,
];
