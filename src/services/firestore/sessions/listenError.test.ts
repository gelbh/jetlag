import { FirebaseError } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());

vi.mock("../../core/analytics/clientErrors", () => ({
  captureException,
}));

import { handleFirestoreListenError } from "./listenError";

describe("handleFirestoreListenError", () => {
  afterEach(() => {
    captureException.mockClear();
  });

  it("skips captureException for expected permission-denied", () => {
    const onError = vi.fn();
    const error = new FirebaseError("permission-denied", "Missing or insufficient permissions.");

    handleFirestoreListenError(error, onError);

    expect(captureException).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("captureException for unexpected listen failures and forwards onError", () => {
    const onError = vi.fn();
    const error = new FirebaseError("unavailable", "Firestore is unavailable.");

    handleFirestoreListenError(error, onError);

    expect(captureException).toHaveBeenCalledExactlyOnceWith(error);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
  });
});
