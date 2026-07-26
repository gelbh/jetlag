import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import { defineSecret } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";

const sentryDsnSecret = defineSecret("SENTRY_DSN");

/** Expected callable HttpsError outcomes — not product bugs. */
const EXPECTED_HTTPS_ERROR_KEYS = new Set([
  "permission-denied:Only the host can do that.",
  "failed-precondition:Session already ended.",
  "internal:Support agent is temporarily unavailable.",
]);

let initialized = false;

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isExpectedFunctionsError(error) {
  if (!(error instanceof HttpsError)) {
    return false;
  }

  return EXPECTED_HTTPS_ERROR_KEYS.has(`${error.code}:${error.message}`);
}

function readAppVersion() {
  const functionsDir = dirname(fileURLToPath(import.meta.url));
  try {
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
