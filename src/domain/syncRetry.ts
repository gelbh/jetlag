import { FirebaseError } from "firebase/app";
import { isFirestorePermissionDenied } from "../services/firestoreAnnotations";

const NON_RETRIABLE_MESSAGE_FRAGMENTS = [
  "session has ended",
  "Unable to access that session",
  "Rejoin session or create a new Premium session",
] as const;

export function isRetriableSyncError(error: unknown): boolean {
  if (isFirestorePermissionDenied(error)) {
    return false;
  }

  if (error instanceof FirebaseError) {
    if (error.code === "unauthenticated") {
      return false;
    }
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (
      NON_RETRIABLE_MESSAGE_FRAGMENTS.some((fragment) =>
        normalized.includes(fragment.toLowerCase()),
      )
    ) {
      return false;
    }
  }

  return true;
}
