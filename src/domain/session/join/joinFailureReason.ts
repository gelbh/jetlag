/** Closed `join_failed` reason set. Enum values only: no code, uid, or message text. */
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
 * so read the cause first. Substrings mirror mapRolePasscodeJoinError.
 */
export function joinFailureReason(error: unknown): JoinFailureReason {
  const source = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  if (!(source instanceof Error)) {
    return "other";
  }

  const { message } = source;
  if (message.includes("Wrong role code")) {
    return "wrong_role_code";
  }
  if (message.includes("Role code is required")) {
    return "role_code_required";
  }
  if (message.includes("App version incompatible")) {
    return "version_mismatch";
  }
  if (message.includes("Client update required.")) {
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
