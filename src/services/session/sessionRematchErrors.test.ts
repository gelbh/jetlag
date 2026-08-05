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

  it("maps bare PERMISSION_DENIED to rejoin copy", () => {
    expect(
      mapRematchError(
        new FirebaseError("functions/permission-denied", "PERMISSION_DENIED"),
      ),
    ).toMatch(/rejoin/i);
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

  it("maps App Check unauthenticated to blocker guidance", () => {
    expect(
      mapRematchError(
        new FirebaseError(
          "functions/unauthenticated",
          "App Check token is invalid.",
        ),
      ),
    ).toMatch(/content blockers/i);
  });

  it("maps network unavailability", () => {
    expect(
      mapRematchError(new FirebaseError("functions/unavailable", "UNAVAILABLE")),
    ).toMatch(/network/i);
  });

  it("does not leak internal or bare Error messages", () => {
    expect(
      mapRematchError(new FirebaseError("functions/internal", "INTERNAL")),
    ).toBe("Could not start rematch. Try again.");
    expect(
      mapRematchError(
        new FirebaseError(
          "functions/failed-precondition",
          "Firestore transactions require all reads to be executed before all writes.",
        ),
      ),
    ).toBe("Could not start rematch. Try again.");
    expect(mapRematchError(new Error("READ_AFTER_WRITE_ERROR_MSG"))).toBe(
      "Could not start rematch. Try again.",
    );
  });
});
