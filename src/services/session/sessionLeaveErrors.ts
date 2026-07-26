import { FirebaseError } from "firebase/app";

const HOST_ONLY_MESSAGE = /Only the host can do that\.?/i;
const ALREADY_ENDED_MESSAGE = /Session already ended\.?/i;

/** Expected leave/end callable outcomes — not product bugs. */
export function isExpectedSessionLeaveError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    const code = error.code.replace(/^functions\//, "");
    if (code === "permission-denied" && HOST_ONLY_MESSAGE.test(error.message)) {
      return true;
    }
    if (
      code === "failed-precondition" &&
      ALREADY_ENDED_MESSAGE.test(error.message)
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    return (
      HOST_ONLY_MESSAGE.test(error.message) ||
      ALREADY_ENDED_MESSAGE.test(error.message)
    );
  }

  return false;
}

export function isExpectedSessionLeaveMessage(message: string): boolean {
  return HOST_ONLY_MESSAGE.test(message) || ALREADY_ENDED_MESSAGE.test(message);
}
