import { describe, expect, it } from "vitest";
import { joinFailureReason } from "./joinFailureReason";

function callableError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function mapped(copy: string, cause: unknown): Error {
  return new Error(copy, { cause });
}

describe("joinFailureReason", () => {
  it("reads the server message from the cause of mapped copy", () => {
    expect(
      joinFailureReason(
        mapped(
          "Enter the role code for that side.",
          callableError("Role code is required.", "functions/invalid-argument"),
        ),
      ),
    ).toBe("role_code_required");
  });

  it("maps a wrong role code, including a status suffix", () => {
    expect(
      joinFailureReason(
        mapped(
          "Wrong role code.",
          callableError("Wrong role code. [403]", "functions/permission-denied"),
        ),
      ),
    ).toBe("wrong_role_code");
  });

  it("maps version and update gates", () => {
    expect(joinFailureReason(new Error("App version incompatible."))).toBe("version_mismatch");
    expect(joinFailureReason(new Error("Client update required."))).toBe("update_required");
  });

  it("maps pass-through session messages", () => {
    expect(joinFailureReason(new Error("Session not found."))).toBe("session_missing");
    expect(joinFailureReason(new Error("Session already ended."))).toBe("session_ended");
  });

  it("maps a callable deadline to timeout", () => {
    expect(
      joinFailureReason(
        mapped(
          "deadline-exceeded",
          callableError("deadline-exceeded", "functions/deadline-exceeded"),
        ),
      ),
    ).toBe("timeout");
  });

  it("falls back to other", () => {
    expect(joinFailureReason(new Error("Joined session could not be loaded."))).toBe("other");
    expect(joinFailureReason("not an error")).toBe("other");
  });
});
