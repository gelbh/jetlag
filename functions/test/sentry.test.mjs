import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS } from "../session/expectedSessionUxHttpsErrors.mjs";
import {
  isAbortErrorEvent,
  isAbortErrorNoise,
  isExpectedFunctionsError,
  readAppVersion,
  resolveDeployedFunctionName,
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

test("isExpectedFunctionsError matches client-update-required HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Client update required."),
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

test("client EXPECTED_JOIN_UX_MESSAGES lists every session UX SoT message", () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const clientPolicy = readFileSync(
    resolve(
      testDir,
      "../../src/services/core/analytics/sentryEventPolicy.ts",
    ),
    "utf8",
  );
  for (const key of EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS) {
    const message = key.slice(key.indexOf(":") + 1);
    assert.ok(
      clientPolicy.includes(`"${message}"`),
      `client denylist missing: ${message}`,
    );
  }
});

test("readAppVersion matches functions package.json (not 0.0.0)", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const testDir = dirname(fileURLToPath(import.meta.url));
  const functionsPackage = JSON.parse(
    readFileSync(resolve(testDir, "../package.json"), "utf8"),
  );
  const rootPackage = JSON.parse(
    readFileSync(resolve(testDir, "../../package.json"), "utf8"),
  );
  assert.equal(readAppVersion(), functionsPackage.version);
  assert.equal(functionsPackage.version, rootPackage.version);
  assert.notEqual(readAppVersion(), "0.0.0");
});

test("resolveDeployedFunctionName prefers explicit name over env", () => {
  const previous = process.env.K_SERVICE;
  process.env.K_SERVICE = "from-env";
  try {
    assert.equal(resolveDeployedFunctionName("joinSessionWithRole"), "joinSessionWithRole");
    assert.equal(
      resolveDeployedFunctionName({ name: "createPremiumSession" }),
      "createPremiumSession",
    );
    assert.equal(resolveDeployedFunctionName(), "from-env");
  } finally {
    if (previous === undefined) {
      delete process.env.K_SERVICE;
    } else {
      process.env.K_SERVICE = previous;
    }
  }
});

test("resolveDeployedFunctionName falls back to FUNCTION_TARGET", () => {
  const prevK = process.env.K_SERVICE;
  const prevT = process.env.FUNCTION_TARGET;
  delete process.env.K_SERVICE;
  process.env.FUNCTION_TARGET = "proxy";
  try {
    assert.equal(resolveDeployedFunctionName(), "proxy");
  } finally {
    if (prevK === undefined) {
      delete process.env.K_SERVICE;
    } else {
      process.env.K_SERVICE = prevK;
    }
    if (prevT === undefined) {
      delete process.env.FUNCTION_TARGET;
    } else {
      process.env.FUNCTION_TARGET = prevT;
    }
  }
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
