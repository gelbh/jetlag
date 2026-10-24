import { JOIN_ERROR_MARKERS } from "./joinErrorMarkers";

export type JoinFailureReason =
  | "role_code_required"
  | "wrong_role_code"
  | "version_mismatch"
  | "update_required"
  | "session_missing"
  | "session_ended"
  | "timeout"
  | "other";

function errorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/**
 * The gated join path rethrows player copy with the callable error as `cause`,
 * so read the cause first.
 */
export function joinFailureReason(error: unknown): JoinFailureReason {
  const source = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  if (!(source instanceof Error)) {
    return "other";
  }

  const { message } = source;
  if (message.includes(JOIN_ERROR_MARKERS.wrongRoleCode)) {
    return "wrong_role_code";
  }
  if (message.includes(JOIN_ERROR_MARKERS.roleCodeRequired)) {
    return "role_code_required";
  }
  if (message.includes(JOIN_ERROR_MARKERS.versionIncompatible)) {
    return "version_mismatch";
  }
  if (message.includes(JOIN_ERROR_MARKERS.clientUpdateRequired)) {
    return "update_required";
  }
  if (message.includes("Session not found")) {
    return "session_missing";
  }
  if (message.includes("Session already ended")) {
    return "session_ended";
  }
  if (errorCode(source) === "functions/deadline-exceeded") {
    return "timeout";
  }
  return "other";
}
