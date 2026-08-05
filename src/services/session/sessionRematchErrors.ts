import { FirebaseError } from "firebase/app";

const FALLBACK = "Could not start rematch. Try again.";

function callableCode(error: FirebaseError): string {
  return error.code.replace(/^functions\//, "");
}

/**
 * Map rematch callable failures to short player-facing copy.
 * Keep membership / App Check / auth distinct from a generic retry.
 */
export function mapRematchError(error: unknown): string {
  if (error instanceof FirebaseError) {
    const code = callableCode(error);
    const message = error.message?.trim() ?? "";

    switch (code) {
      case "permission-denied":
        return message && !/^PERMISSION_DENIED$/i.test(message)
          ? message
          : "You are not a member of this session anymore. Rejoin to rematch.";
      case "unauthenticated":
        if (/app check/i.test(message)) {
          return "Security check failed. Disable content blockers for this site, then try again.";
        }
        return "Sign in required to rematch.";
      case "failed-precondition":
        if (/app check/i.test(message)) {
          return "Security check failed. Disable content blockers for this site, then try again.";
        }
        return message || FALLBACK;
      case "not-found":
        return "Session not found. It may have ended.";
      case "unavailable":
      case "deadline-exceeded":
        return "Network error starting rematch. Check your connection and try again.";
      default:
        return message && message !== "INTERNAL" ? message : FALLBACK;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return FALLBACK;
}
