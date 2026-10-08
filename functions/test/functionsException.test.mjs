import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { HttpsError } from "firebase-functions/v2/https";
import {
  isAbortErrorNoise,
  isExpectedFunctionsError,
  isOverpassTransportNoise,
  readAppVersion,
  resolveDeployedFunctionName,
  resolveFunctionsExceptionEnvironment,
  setFunctionsExceptionClientForTests,
  shouldSkipFunctionsException,
} from "../lib/functionsException.mjs";
import { EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS } from "../session/expectedSessionUxHttpsErrors.mjs";

function fetchFailedWithCause(cause) {
  const error = new TypeError("fetch failed");
  error.cause = cause;
  return error;
}

test("isAbortErrorNoise matches AbortError Error and DOMException", () => {
  const named = new Error("This operation was aborted");
  named.name = "AbortError";
  assert.equal(isAbortErrorNoise(named), true);
  assert.equal(isAbortErrorNoise(new DOMException("Aborted", "AbortError")), true);
  assert.equal(isAbortErrorNoise(new Error("Overpass timed out.")), false);
  assert.equal(isAbortErrorNoise(null), false);
});

test("isExpectedFunctionsError treats AbortError as expected noise", () => {
  const named = new Error("This operation was aborted");
  named.name = "AbortError";
  assert.equal(isExpectedFunctionsError(named), true);
});

test("isOverpassTransportNoise matches ConnectTimeout under fetch failed (JETLAG-3X)", () => {
  const cause = new Error("Connect Timeout Error");
  cause.name = "ConnectTimeoutError";
  cause.code = "UND_ERR_CONNECT_TIMEOUT";
  assert.equal(isOverpassTransportNoise(fetchFailedWithCause(cause)), true);
});

test("isOverpassTransportNoise matches EPIPE under fetch failed (JETLAG-3T)", () => {
  const cause = new Error("connect EPIPE 203.0.113.10:443");
  cause.code = "EPIPE";
  assert.equal(isOverpassTransportNoise(fetchFailedWithCause(cause)), true);
});

test("isOverpassTransportNoise does not drop unrelated fetch failed", () => {
  const cause = new Error("getaddrinfo ENOTFOUND overpass.example");
  cause.code = "ENOTFOUND";
  assert.equal(isOverpassTransportNoise(fetchFailedWithCause(cause)), false);
  assert.equal(isOverpassTransportNoise(new TypeError("fetch failed")), false);
  assert.equal(isOverpassTransportNoise(new Error("Overpass query failed.")), false);
  assert.equal(isOverpassTransportNoise(null), false);
});

// Transport fetch-failed is not an expected HttpsError, but shouldSkip gates it
// (former Sentry beforeSend residual drop).
test("shouldSkipFunctionsException drops overpass transport fetch-failed", () => {
  const cause = new Error("Connect Timeout Error");
  cause.name = "ConnectTimeoutError";
  cause.code = "UND_ERR_CONNECT_TIMEOUT";
  assert.equal(isExpectedFunctionsError(fetchFailedWithCause(cause)), false);
  assert.equal(shouldSkipFunctionsException(fetchFailedWithCause(cause)), true);

  const epipe = new Error("connect EPIPE 203.0.113.10:443");
  epipe.code = "EPIPE";
  assert.equal(isExpectedFunctionsError(fetchFailedWithCause(epipe)), false);
  assert.equal(shouldSkipFunctionsException(fetchFailedWithCause(epipe)), true);
});

test("isExpectedFunctionsError matches host-only leave HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("permission-denied", "Only the host can do that.")),
    true,
  );
});

test("isExpectedFunctionsError matches session-already-ended HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("failed-precondition", "Session already ended.")),
    true,
  );
});

test("isExpectedFunctionsError matches support agent unavailable HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("internal", "Support agent is temporarily unavailable."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches grantAccess expected HttpsErrors", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("unauthenticated", "Sign in required.")),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(new HttpsError("invalid-argument", "Access code required.")),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("resource-exhausted", "Too many attempts. Try again later."),
    ),
    true,
  );
  assert.equal(
    isExpectedFunctionsError(new HttpsError("permission-denied", "Invalid access code.")),
    true,
  );
});

test("isExpectedFunctionsError matches billing recovery rate-limit HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("resource-exhausted", "Too many recovery attempts. Try again tomorrow."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches incident no-linked-session HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Incident has no linked session."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches invalid premium session payload HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("invalid-argument", "Invalid premium session payload."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches session-ops agent limit HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("resource-exhausted", "Session-ops agent limit reached for this session."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches role-code required HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("invalid-argument", "Role code is required.")),
    true,
  );
});

test("isExpectedFunctionsError matches wrong-role-code HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("permission-denied", "Wrong role code.")),
    true,
  );
});

test("isExpectedFunctionsError matches empty-side join HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(
      new HttpsError("failed-precondition", "Join without a request — this side is empty."),
    ),
    true,
  );
});

test("isExpectedFunctionsError matches join-not-pending HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("failed-precondition", "Join request is not pending.")),
    true,
  );
});

test("isExpectedFunctionsError matches app-version-incompatible HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("failed-precondition", "App version incompatible.")),
    true,
  );
});

test("isExpectedFunctionsError matches client-update-required HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("failed-precondition", "Client update required.")),
    true,
  );
});

test("isExpectedFunctionsError matches join-request-expired HttpsError", () => {
  assert.equal(
    isExpectedFunctionsError(new HttpsError("failed-precondition", "Join request expired.")),
    true,
  );
});

test("captureFunctionsException no-ops for expected join HttpsErrors", async () => {
  const { captureFunctionsException } = await import("../lib/functionsException.mjs");
  const calls = [];
  setFunctionsExceptionClientForTests({
    captureExceptionImmediate: async (...args) => {
      calls.push(args);
    },
  });
  const expected = [
    new HttpsError("permission-denied", "Wrong role code."),
    new HttpsError("failed-precondition", "Join without a request — this side is empty."),
    new HttpsError("failed-precondition", "Join request is not pending."),
    new HttpsError("failed-precondition", "App version incompatible."),
  ];
  for (const error of expected) {
    assert.equal(isExpectedFunctionsError(error), true);
    assert.doesNotThrow(() => captureFunctionsException(error));
  }
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(calls.length, 0);
  setFunctionsExceptionClientForTests(null);
});

test("captureFunctionsExceptionAsync sends unexpected errors to PostHog", async () => {
  const { captureFunctionsExceptionAsync } = await import("../lib/functionsException.mjs");
  const calls = [];
  setFunctionsExceptionClientForTests({
    captureExceptionImmediate: async (error, distinctId, properties) => {
      calls.push({ error, distinctId, properties });
    },
  });
  const boom = new Error("unexpected boom");
  await captureFunctionsExceptionAsync(boom, { name: "proxy" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].error, boom);
  assert.equal(calls[0].distinctId, "jetlag-functions");
  assert.equal(calls[0].properties.function_name, "proxy");
  assert.equal(calls[0].properties.callable, "proxy");
  setFunctionsExceptionClientForTests(null);
});

test("captureFunctionsException returns a promise that settles after Immediate capture", async () => {
  const { captureFunctionsException } = await import("../lib/functionsException.mjs");
  let settled = false;
  setFunctionsExceptionClientForTests({
    captureExceptionImmediate: async () => {
      await new Promise((r) => setTimeout(r, 15));
      settled = true;
    },
  });
  const pending = captureFunctionsException(new Error("await me"));
  assert.equal(typeof pending?.then, "function");
  assert.equal(settled, false);
  await pending;
  assert.equal(settled, true);
  setFunctionsExceptionClientForTests(null);
});

test("captureFunctionsExceptionWithTags returns a promise that settles after Immediate capture", async () => {
  const { captureFunctionsExceptionWithTags } = await import("../lib/functionsException.mjs");
  let settled = false;
  setFunctionsExceptionClientForTests({
    captureExceptionImmediate: async () => {
      await new Promise((r) => setTimeout(r, 15));
      settled = true;
    },
  });
  const pending = captureFunctionsExceptionWithTags(new Error("await tags"), {
    name: "proxy",
    extraTags: { proxy_route: "overpass" },
  });
  assert.equal(typeof pending?.then, "function");
  assert.equal(settled, false);
  await pending;
  assert.equal(settled, true);
  setFunctionsExceptionClientForTests(null);
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
    resolve(testDir, "../../src/services/core/analytics/clientExceptionPolicy.ts"),
    "utf8",
  );
  for (const key of EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS) {
    const message = key.slice(key.indexOf(":") + 1);
    assert.ok(clientPolicy.includes(`"${message}"`), `client denylist missing: ${message}`);
  }
});

test("readAppVersion matches functions package.json (not 0.0.0)", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const testDir = dirname(fileURLToPath(import.meta.url));
  const functionsPackage = JSON.parse(readFileSync(resolve(testDir, "../package.json"), "utf8"));
  const rootPackage = JSON.parse(readFileSync(resolve(testDir, "../../package.json"), "utf8"));
  assert.equal(readAppVersion(), functionsPackage.version);
  assert.equal(functionsPackage.version, rootPackage.version);
  assert.notEqual(readAppVersion(), "0.0.0");
});

test("resolveDeployedFunctionName prefers explicit name over env", () => {
  const previous = process.env.K_SERVICE;
  process.env.K_SERVICE = "from-env";
  try {
    assert.equal(resolveDeployedFunctionName("joinSessionWithRole"), "joinSessionWithRole");
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
  assert.equal(isExpectedFunctionsError(new HttpsError("not-found", "Session not found.")), false);
  assert.equal(
    isExpectedFunctionsError(new HttpsError("permission-denied", "Session membership required.")),
    false,
  );
  assert.equal(
    isExpectedFunctionsError(new HttpsError("internal", "Unexpected support agent failure.")),
    false,
  );
  assert.equal(isExpectedFunctionsError(new Error("LEAVE_NOT_HOST")), false);
  assert.equal(isExpectedFunctionsError(new Error("SESSION_OPS_AGENT_FAILED")), false);
  assert.equal(isExpectedFunctionsError(null), false);
});

test("resolveFunctionsExceptionEnvironment prefers emulator then FUNCTIONS_EXCEPTION_ENVIRONMENT", () => {
  assert.equal(
    resolveFunctionsExceptionEnvironment({
      FUNCTIONS_EMULATOR: "true",
      FUNCTIONS_EXCEPTION_ENVIRONMENT: "staging",
    }),
    "emulator",
  );
  assert.equal(
    resolveFunctionsExceptionEnvironment({ FUNCTIONS_EXCEPTION_ENVIRONMENT: " staging " }),
    "staging",
  );
  assert.equal(resolveFunctionsExceptionEnvironment({}), "production");
  assert.equal(
    resolveFunctionsExceptionEnvironment({ FUNCTIONS_EXCEPTION_ENVIRONMENT: "  " }),
    "production",
  );
});
