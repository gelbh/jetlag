import { captureException } from "../../core/analytics/clientErrors";
import { isFirestorePermissionDenied } from "./shared";

/**
 * Shared onSnapshot onError path for map-session listeners.
 * Expected mid-session permission loss → caller UX only (no exception capture).
 * Unexpected failures → captureException, then forward to onError.
 */
export function handleFirestoreListenError(error: unknown, onError: (error: Error) => void): void {
  const normalized = error instanceof Error ? error : new Error(String(error));

  if (isFirestorePermissionDenied(error)) {
    onError(normalized);
    return;
  }

  captureException(error);
  onError(normalized);
}
