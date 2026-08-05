import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { mapRematchError } from "./sessionRematchErrors";

describe("mapRematchError", () => {
  it("surfaces membership permission-denied from the callable", () => {
    expect(
      mapRematchError(
        new FirebaseError(
          "functions/permission-denied",
          "Session membership required.",
        ),
      ),
    ).toBe("Session membership required.");
  });

  it("maps App Check failed-precondition to blocker guidance", () => {
    expect(
      mapRematchError(
        new FirebaseError(
          "functions/failed-precondition",
          "Callable requests must have App Check tokens.",
        ),
      ),
    ).toMatch(/content blockers/i);
  });

  it("maps network unavailability", () => {
    expect(
      mapRematchError(new FirebaseError("functions/unavailable", "UNAVAILABLE")),
    ).toMatch(/network/i);
  });

  it("falls back for opaque internal errors", () => {
    expect(
      mapRematchError(new FirebaseError("functions/internal", "INTERNAL")),
    ).toBe("Could not start rematch. Try again.");
  });
});
