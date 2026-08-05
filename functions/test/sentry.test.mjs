import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import {
  isAbortErrorEvent,
  isAbortErrorNoise,
  isExpectedFunctionsError,
} from "../lib/sentry.mjs";

test("isAbortErrorNoise matches AbortError Error and DOMException", () => {
  const named = new Error("This operation was aborted");
  named.name = "AbortError";
  assert.equal(isAbortErrorNoise(named), true);
  assert.equal(
    isAbortErrorNoise(new DOMException("Aborted", "AbortError")),
    true,
  );
  assert.equal(isAbortErrorNoise(new Error("Overpass timed out.")), false);
  assert.equal(isAbortErrorNoise(null), false);
});

test("isAbortErrorEvent matches Discover AbortError title shape", () => {
  const event = {
    exception: {
      values: [{ type: "AbortError", value: "This operation was aborted" }],
    },
  };
  assert.equal(isAbortErrorEvent(event), true);
});

test("isExpectedFunctionsError treats AbortError as expected noise", () => {
  const named = new Error("This operation was aborted");
  named.name = "AbortError";
  assert.equal(isExpectedFunctionsError(named), true);
});

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

test("isExpectedFunctionsError matches support agent LLM unavailable HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError(
        "internal",
        "Support agent is temporarily unavailable.",
      ),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches grantAccess expected HttpsErrors", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("unauthenticated", "Sign in required."),
    ),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("invalid-argument", "Access code required."),
    ),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError(
        "resource-exhausted",
        "Too many attempts. Try again later.",
      ),
    ),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("permission-denied", "Invalid access code."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches billing recovery rate-limit HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError(
        "resource-exhausted",
        "Too many recovery attempts. Try again tomorrow.",
      ),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches role-code required HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("invalid-argument", "Role code is required."),
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
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("internal", "Unexpected support agent failure."),
    ),
    false,
  );
  assert.equal(isExpectedFunctionsError(new Error("LEAVE_NOT_HOST")), false);
  assert.equal(
    isExpectedFunctionsError(new Error("SESSION_OPS_LLM_FAILED")),
    false,
  );
  assert.equal(isExpectedFunctionsError(null), false);
});
