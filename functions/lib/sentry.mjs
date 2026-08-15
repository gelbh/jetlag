import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import { defineSecret } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";
import { EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS } from "../session/expectedSessionUxHttpsErrors.mjs";

const sentryDsnSecret = defineSecret("SENTRY_DSN");

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
  ...EXPECTED_SESSION_UX_HTTPS_ERROR_KEYS,
]);

let initialized = false;

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
 * @param {import("@sentry/node").ErrorEvent} event
 * @returns {boolean}
 */
export function isAbortErrorEvent(event) {
  for (const exception of event.exception?.values ?? []) {
    if (exception.type === "AbortError") {
      return true;
    }
    if (
      typeof exception.value === "string" &&
      /operation was aborted/i.test(exception.value)
    ) {
      return true;
    }
  }

  if (
    typeof event.message === "string" &&
    (/AbortError/i.test(event.message) ||
      /operation was aborted/i.test(event.message))
  ) {
    return true;
  }

  return false;
}

export function readAppVersion() {
  const functionsDir = dirname(fileURLToPath(import.meta.url));
  try {
    // functions/package.json is in the Firebase deploy bundle (root is not).
    const packageJson = JSON.parse(
      readFileSync(resolve(functionsDir, "../package.json"), "utf8"),
    );
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function getSentryDsnSecret() {
  return sentryDsnSecret;
}

export function initFunctionsSentry() {
  if (initialized) {
    return;
  }

  const dsn = sentryDsnSecret.value();
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: "production",
    release: `jetlag@${readAppVersion()}`,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (isAbortErrorEvent(event)) {
        return null;
      }
      return event;
    },
  });
  initialized = true;
}

export function captureFunctionsException(error) {
  if (!initialized) {
    return;
  }

  if (isExpectedFunctionsError(error)) {
    return;
  }

  Sentry.captureException(error);
}

/**
 * @template {(...args: never[]) => unknown} T
 * @param {T} handler
 * @returns {T}
 */
export function withSentryHttpHandler(handler) {
  return async (...args) => {
    initFunctionsSentry();
    try {
      return await handler(...args);
    } catch (error) {
      captureFunctionsException(error);
      await Sentry.flush(2000);
      throw error;
    }
  };
}

/**
 * @template {(...args: never[]) => unknown} T
 * @param {T} handler
 * @returns {T}
 */
export function withSentryEventHandler(handler) {
  return async (...args) => {
    initFunctionsSentry();
    try {
      return await handler(...args);
    } catch (error) {
      captureFunctionsException(error);
      await Sentry.flush(2000);
      throw error;
    }
  };
}
