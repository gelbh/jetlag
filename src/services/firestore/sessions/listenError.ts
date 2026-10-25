import { captureException } from "../../core/analytics/clientErrors";
import { isFirestorePermissionDenied } from "./shared";

export type FirestoreListenErrorOptions = {
  /** Stable op name for PostHog (e.g. `subscribe:session`). */
  firestoreOp?: string;
};

/**
 * Shared onSnapshot onError path for map-session listeners.
 * Expected mid-session permission loss → caller UX only (no exception capture).
 * Unexpected failures → captureException (with optional firestore_op), then forward to onError.
 */
export function handleFirestoreListenError(
  error: unknown,
  onError: (error: Error) => void,
  options?: FirestoreListenErrorOptions,
): void {
  const normalized = error instanceof Error ? error : new Error(String(error));

  if (isFirestorePermissionDenied(error)) {
    onError(normalized);
    return;
  }

  if (options?.firestoreOp) {
    captureException(error, { firestore_op: options.firestoreOp });
  } else {
    captureException(error);
  }
  onError(normalized);
}
