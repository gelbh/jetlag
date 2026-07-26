import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import {
  isExpectedSessionLeaveError,
  isExpectedSessionLeaveMessage,
} from "./sessionLeaveErrors";

describe("isExpectedSessionLeaveError", () => {
  it("matches callable host-only permission-denied", () => {
    expect(
      isExpectedSessionLeaveError(
        new FirebaseError(
          "functions/permission-denied",
          "Only the host can do that.",
        ),
      ),
    ).toBe(true);
  });

  it("matches callable session-already-ended", () => {
    expect(
      isExpectedSessionLeaveError(
        new FirebaseError(
          "functions/failed-precondition",
          "Session already ended.",
        ),
      ),
    ).toBe(true);
  });

  it("ignores unrelated Firebase errors", () => {
    expect(
      isExpectedSessionLeaveError(
        new FirebaseError("functions/internal", "INTERNAL"),
      ),
    ).toBe(false);
    expect(
      isExpectedSessionLeaveError(
        new FirebaseError(
          "functions/permission-denied",
          "Session membership required.",
        ),
      ),
    ).toBe(false);
  });
});

describe("isExpectedSessionLeaveMessage", () => {
  it("matches host-only and already-ended copy", () => {
    expect(isExpectedSessionLeaveMessage("Only the host can do that.")).toBe(
      true,
    );
    expect(isExpectedSessionLeaveMessage("Session already ended.")).toBe(true);
  });

  it("ignores unrelated messages", () => {
    expect(isExpectedSessionLeaveMessage("Couldn't leave the session.")).toBe(
      false,
    );
  });
});
