import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { isRetriableSyncError } from "./syncRetry";

describe("isRetriableSyncError", () => {
  it("rejects permission-denied errors", () => {
    expect(
      isRetriableSyncError(
        new FirebaseError("permission-denied", "Missing permission."),
      ),
    ).toBe(false);
  });

  it("rejects ended-session messages", () => {
    expect(
      isRetriableSyncError(new Error("That session has ended. Join or create a new one.")),
    ).toBe(false);
  });

  it("accepts generic network failures", () => {
    expect(isRetriableSyncError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetriableSyncError(new Error("Sync failed."))).toBe(true);
  });
});
