import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { isDefinitiveAuthFailure } from "./authRecovery";

describe("isDefinitiveAuthFailure", () => {
  it.each([
    "auth/user-token-expired",
    "auth/invalid-refresh-token",
    "auth/user-disabled",
    "auth/user-not-found",
    "auth/invalid-user-token",
  ])("treats %s as definitive", (code) => {
    expect(isDefinitiveAuthFailure(new FirebaseError(code, code))).toBe(true);
  });

  it.each([
    "auth/network-request-failed",
    "auth/internal-error",
    "auth/timeout",
    "auth/too-many-requests",
  ])("keeps the user on %s", (code) => {
    expect(isDefinitiveAuthFailure(new FirebaseError(code, code))).toBe(false);
  });

  it("keeps the user on plain TypeError (Failed to fetch)", () => {
    expect(isDefinitiveAuthFailure(new TypeError("Failed to fetch"))).toBe(
      false,
    );
  });
});
