import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Sentry from "@sentry/node";
import { defineSecret } from "firebase-functions/params";

const sentryDsnSecret = defineSecret("SENTRY_DSN");

let initialized = false;

function readAppVersion() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const packageJson = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  return packageJson.version ?? "0.0.0";
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
