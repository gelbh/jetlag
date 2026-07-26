import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { isExpectedFunctionsError } from "../lib/sentry.mjs";

test("isExpectedFunctionsError matches host-only leave HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("permission-denied", "Only the host can do that."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches session-already-ended HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Session already ended."),
    ),
    true,
  );
});

test("isExpectedFunctionsError ignores unrelated HttpsErrors and plain Errors", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("not-found", "Session not found."),
    ),
    false,
  );
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("permission-denied", "Session membership required."),
    ),
    false,
  );
  assert.equal(isExpectedFunctionsError(new Error("LEAVE_NOT_HOST")), false);
  assert.equal(isExpectedFunctionsError(null), false);
});
