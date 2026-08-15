import { FirebaseError } from "firebase/app";

const FALLBACK = "Could not start rematch. Try again.";
const APP_CHECK_MESSAGE =
  "Security check failed. Disable content blockers for this site, then try again.";
const MEMBERSHIP_MESSAGE =
  "You are not a member of this session anymore. Rejoin to rematch.";

const MEMBERSHIP_SERVER_MESSAGE = /session membership required/i;

function callableCode(error: FirebaseError): string {
  return error.code.replace(/^functions\//, "");
}

function isAppCheckMessage(message: string): boolean {
  return /app check/i.test(message);
}

/**
 * Map rematch callable failures to short player-facing copy.
 * Unknown / internal messages stay behind the fallback (no TX leak).
 */
export function mapRematchError(error: unknown): string {
  if (error instanceof FirebaseError) {
    const code = callableCode(error);
    const message = error.message?.trim() ?? "";

    switch (code) {
      case "permission-denied":
        if (MEMBERSHIP_SERVER_MESSAGE.test(message)) {
          return message;
        }
        return MEMBERSHIP_MESSAGE;
      case "unauthenticated":
        if (isAppCheckMessage(message)) {
          return APP_CHECK_MESSAGE;
        }
        return "Sign in required to rematch.";
      case "failed-precondition":
        if (isAppCheckMessage(message)) {
          return APP_CHECK_MESSAGE;
        }
        if (/round is not over/i.test(message)) {
          return "Finish this round before rematching.";
        }
        return FALLBACK;
      case "not-found":
        return "Session not found. It may have ended.";
      case "unavailable":
      case "deadline-exceeded":
        return "Network error starting rematch. Check your connection and try again.";
      default:
        return FALLBACK;
    }
  }

  return FALLBACK;
}
