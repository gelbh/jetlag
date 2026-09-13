import { FirebaseError } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
const reportFirestoreListenPermissionDenied = vi.hoisted(() => vi.fn());

vi.mock("../../core/analytics/sentry", () => ({
  captureException,
  reportFirestoreListenPermissionDenied,
}));

import { handleFirestoreListenError } from "./listenError";

describe("handleFirestoreListenError", () => {
  afterEach(() => {
    captureException.mockClear();
    reportFirestoreListenPermissionDenied.mockClear();
  });

  it("breadcrumbs expected permission-denied without captureException", () => {
    const onError = vi.fn();
    const error = new FirebaseError(
      "permission-denied",
      "Missing or insufficient permissions.",
    );

    handleFirestoreListenError(error, onError);

    expect(reportFirestoreListenPermissionDenied).toHaveBeenCalledOnce();
    expect(captureException).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("captureException for unexpected listen failures and forwards onError", () => {
    const onError = vi.fn();
    const error = new FirebaseError("unavailable", "Firestore is unavailable.");

    handleFirestoreListenError(error, onError);

    expect(reportFirestoreListenPermissionDenied).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledExactlyOnceWith(error);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });
});
