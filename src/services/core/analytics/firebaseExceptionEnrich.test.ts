import { describe, expect, it } from "vitest";
import {
  enrichFirebaseExceptionProperties,
  readFirebaseErrorCode,
} from "./firebaseExceptionEnrich";

describe("readFirebaseErrorCode", () => {
  it("reads code from FirebaseError-shaped errors", () => {
    const error = Object.assign(new Error("Missing or insufficient permissions."), {
      name: "FirebaseError",
      code: "permission-denied",
    });
    expect(readFirebaseErrorCode(error)).toBe("permission-denied");
  });

  it("returns undefined without a code", () => {
    expect(readFirebaseErrorCode(new Error("boom"))).toBeUndefined();
  });
});

describe("enrichFirebaseExceptionProperties", () => {
  it("sets firebase_code from existing code prop then deletes code", () => {
    const next = enrichFirebaseExceptionProperties({ code: "permission-denied" });
    expect(next?.firebase_code).toBe("permission-denied");
    expect(next).not.toHaveProperty("code");
  });

  it("infers permission-denied from FirebaseError exception list when code missing", () => {
    const next = enrichFirebaseExceptionProperties({
      $exception_list: [{ type: "FirebaseError", value: "Missing or insufficient permissions." }],
    });
    expect(next?.firebase_code).toBe("permission-denied");
  });

  it("does not overwrite an existing firebase_code", () => {
    const next = enrichFirebaseExceptionProperties({
      firebase_code: "already/set",
      $exception_list: [{ type: "FirebaseError", value: "Missing or insufficient permissions." }],
    });
    expect(next?.firebase_code).toBe("already/set");
  });
});
