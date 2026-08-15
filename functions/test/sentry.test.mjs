import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS } from "../handlers/session/shared.mjs";
import {
  isAbortErrorEvent,
  isAbortErrorNoise,
  isExpectedFunctionsError,
  readAppVersion,
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

test("isExpectedFunctionsError matches wrong-role-code HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("permission-denied", "Wrong role code."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches empty-side join HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError(
        "failed-precondition",
        "Join without a request — this side is empty.",
      ),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches join-not-pending HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Join request is not pending."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches app-version-incompatible HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "App version incompatible."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches join-request-expired HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Join request expired."),
    ),
    true,
  );
});

test("captureFunctionsException no-ops for expected join HttpsErrors", async () => {
  const { captureFunctionsException } = await import("../lib/sentry.mjs");
  const expected = [
    new HttpsError("permission-denied", "Wrong role code."),
    new HttpsError(
      "failed-precondition",
      "Join without a request — this side is empty.",
    ),
    new HttpsError("failed-precondition", "Join request is not pending."),
    new HttpsError("failed-precondition", "App version incompatible."),
  ];
  for (const error of expected) {
    assert.equal(isExpectedFunctionsError(error), true);
    // Expected gate runs before Sentry.captureException; must not throw.
    assert.doesNotThrow(() => captureFunctionsException(error));
  }
});

test("EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS are all allowlisted", () => {
  for (const key of EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS) {
    const colon = key.indexOf(":");
    assert.ok(colon > 0, `invalid key: ${key}`);
    const code = key.slice(0, colon);
    const message = key.slice(colon + 1);
    assert.equal(
      isExpectedFunctionsError(new HttpsError(code, message)),
      true,
      `missing allowlist entry: ${key}`,
    );
  }
});

test("readAppVersion matches root package.json (not 0.0.0)", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const rootPackage = JSON.parse(
    readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../package.json"),
      "utf8",
    ),
  );
  assert.equal(readAppVersion(), rootPackage.version);
  assert.notEqual(readAppVersion(), "0.0.0");
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
