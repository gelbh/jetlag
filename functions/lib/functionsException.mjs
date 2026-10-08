import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpsError } from "firebase-functions/v2/https";
import { EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS } from "../session/expectedSessionUxHttpsErrors.mjs";
import {
  capturePosthogException,
  getOrCreateFunctionsExceptionClient,
  posthogProjectApiKey,
} from "./posthog.mjs";

/**
 * Expected callable HttpsError outcomes — not product bugs.
 * Session join/role keys come from expectedSessionUxHttpsErrors.mjs.
 */
const EXPECTED_HTTPS_ERROR_KEYS = new Set([
  "permission-denied:Only the host can do that.",
  "failed-precondition:Session already ended.",
  "internal:Support agent is temporarily unavailable.",
  "unauthenticated:Sign in required.",
  "invalid-argument:Access code required.",
  "resource-exhausted:Too many attempts. Try again later.",
  "permission-denied:Invalid access code.",
  "resource-exhausted:Too many recovery attempts. Try again tomorrow.",
  "failed-precondition:Incident has no linked session.",
  "invalid-argument:Invalid premium session payload.",
  "resource-exhausted:Session-ops agent limit reached for this session.",
  ...EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS,
]);

let initialized = false;

/** @type {{
 *   captureException?: Function,
 *   captureExceptionImmediate?: Function,
 *   flush?: Function,
 * } | null} */
let testClientImpl = null;

/**
 * Upstream fetch timeout / client disconnect aborts — not product bugs.
 * JETLAG-T: AbortError on POST /overpass (Cloud Functions), often with HTTP 200
 * after failover success while an aborted attempt was still reported.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAbortErrorNoise(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? error.name : undefined;
  if (name === "AbortError") {
    return true;
  }

  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }

  return false;
}

/**
 * Overpass/postpass undici transport noise under TypeError: fetch failed.
 * JETLAG-3X: ConnectTimeoutError / UND_ERR_CONNECT_TIMEOUT
 * JETLAG-3T: EPIPE
 * Keep unrelated fetch-failed causes loud (total upstream failure).
 * @param {unknown} cause
 * @returns {boolean}
 */
function isOverpassTransportCause(cause) {
  if (!cause || typeof cause !== "object") {
    return false;
  }

  const name = "name" in cause ? cause.name : undefined;
  const code = "code" in cause ? cause.code : undefined;
  const message = "message" in cause && cause.message != null ? String(cause.message) : "";

  if (name === "ConnectTimeoutError" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return true;
  }

  if (code === "EPIPE" || /\bEPIPE\b/.test(message)) {
    return true;
  }

  return false;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isOverpassTransportNoise(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? error.name : undefined;
  const message = "message" in error && error.message != null ? String(error.message) : "";
  if (name !== "TypeError" || !/fetch failed/i.test(message)) {
    return false;
  }

  return isOverpassTransportCause("cause" in error ? error.cause : undefined);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isExpectedFunctionsError(error) {
  if (isAbortErrorNoise(error)) {
    return true;
  }

  if (!(error instanceof HttpsError)) {
    return false;
  }

  return EXPECTED_HTTPS_ERROR_KEYS.has(`${error.code}:${error.message}`);
}

/**
 * True when capture should skip (expected UX errors or Overpass transport noise).
 * Overpass fetch-failed residuals were previously dropped in Sentry beforeSend;
 * without that hook they must be gated here.
 * @param {unknown} error
 * @returns {boolean}
 */
export function shouldSkipFunctionsException(error) {
  return isExpectedFunctionsError(error) || isOverpassTransportNoise(error);
}

export function readAppVersion() {
  const functionsDir = dirname(fileURLToPath(import.meta.url));
  try {
    // functions/package.json is in the Firebase deploy bundle (root is not).
    const packageJson = JSON.parse(readFileSync(resolve(functionsDir, "../package.json"), "utf8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveFunctionsExceptionEnvironment(env = process.env) {
  if (env.FUNCTIONS_EMULATOR === "true") {
    return "emulator";
  }
  if (
    typeof env.FUNCTIONS_EXCEPTION_ENVIRONMENT === "string" &&
    env.FUNCTIONS_EXCEPTION_ENVIRONMENT.trim()
  ) {
    return env.FUNCTIONS_EXCEPTION_ENVIRONMENT.trim();
  }
  return "production";
}

/**
 * Prefer an explicit name; else Cloud Run / Functions env (gen2 sets K_SERVICE).
 * Lets deadline-exceeded / unhandled errors attribute to a callable without
 * rewriting every onCall wrapper (JETLAG-3M).
 *
 * @param {string | undefined} [explicit]
 * @returns {string | null}
 */
export function resolveDeployedFunctionName(explicit) {
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim();
  }
  for (const key of ["K_SERVICE", "FUNCTION_TARGET", "FUNCTION_NAME"]) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Idempotent: ensures the PostHog exception client can be created from the secret.
 * Soft no-op when the secret is unset (local/tests without GSM).
 */
export function initFunctionsExceptionCapture() {
  if (initialized) {
    return;
  }

  const client = getOrCreateFunctionsExceptionClient(
    testClientImpl ? { clientImpl: testClientImpl } : {},
  );
  if (!client) {
    return;
  }

  initialized = true;
}

/**
 * Test-only: inject a mock PostHog client and mark capture initialized.
 * @param {{
 *   captureException?: Function,
 *   captureExceptionImmediate?: Function,
 *   flush?: Function,
 * } | null} clientImpl
 */
export function setFunctionsExceptionClientForTests(clientImpl) {
  testClientImpl = clientImpl;
  initialized = Boolean(clientImpl);
}

/**
 * @param {Record<string, unknown>} properties
 * @param {string | null} name
 * @param {Record<string, string> | undefined} extraTags
 */
function applyFunctionNameProperties(properties, name, extraTags) {
  if (name) {
    properties.function_name = name;
    properties.callable = name;
  }
  if (extraTags) {
    for (const [key, value] of Object.entries(extraTags)) {
      if (typeof value === "string") {
        properties[key] = value;
      }
    }
  }
  properties.environment = resolveFunctionsExceptionEnvironment();
  properties.release = `jetlag@${readAppVersion()}`;
}

/**
 * @param {unknown} error
 * @param {{ name?: string | null, extraTags?: Record<string, string> }} [options]
 */
export async function captureFunctionsExceptionAsync(error, options = {}) {
  initFunctionsExceptionCapture();
  if (!initialized) {
    return;
  }

  if (shouldSkipFunctionsException(error)) {
    return;
  }

  const name =
    typeof options.name === "string" && options.name.trim()
      ? options.name.trim()
      : resolveDeployedFunctionName();

  /** @type {Record<string, unknown>} */
  const properties = {};
  applyFunctionNameProperties(properties, name, options.extraTags);

  await capturePosthogException({
    error,
    properties,
    clientImpl: testClientImpl ?? undefined,
  });
}

export function captureFunctionsException(error) {
  void captureFunctionsExceptionAsync(error);
}

/**
 * Capture with function_name/callable (+ optional extra tags) in one place so
 * proxy / callable catch paths cannot drift.
 *
 * @param {unknown} error
 * @param {{ name?: string | null, extraTags?: Record<string, string> }} [options]
 */
export function captureFunctionsExceptionWithTags(error, options = {}) {
  void captureFunctionsExceptionAsync(error, options);
}

/**
 * @template {(...args: never[]) => unknown} T
 * @param {T} handler
 * @param {string | undefined} [explicitName]
 * @returns {T}
 */
export function withFunctionsExceptionHandler(handler, explicitName) {
  return async (...args) => {
    initFunctionsExceptionCapture();
    const name = resolveDeployedFunctionName(explicitName);
    try {
      return await handler(...args);
    } catch (error) {
      await captureFunctionsExceptionAsync(error, { name });
      throw error;
    }
  };
}

/** Re-export secret for handler `secrets: [...]` wiring. */
export { posthogProjectApiKey };
