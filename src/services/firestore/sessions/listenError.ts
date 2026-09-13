import { captureException, reportFirestoreListenPermissionDenied } from "../../core/analytics/sentry";
import { isFirestorePermissionDenied } from "./shared";

/**
 * Shared onSnapshot onError path for map-session listeners.
 * Expected mid-session permission loss → breadcrumb + caller UX (no Sentry issue).
 * Unexpected failures → captureException, then forward to onError.
 */
export function handleFirestoreListenError(
  error: unknown,
  onError: (error: Error) => void,
): void {
  const normalized =
    error instanceof Error ? error : new Error(String(error));

  if (isFirestorePermissionDenied(error)) {
    reportFirestoreListenPermissionDenied();
    onError(normalized);
    return;
  }

  captureException(error);
  onError(normalized);
}
