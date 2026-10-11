import { createHash } from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { PostHog } from "posthog-node";

export const posthogProjectApiKey = defineSecret("POSTHOG_PROJECT_API_KEY");

/** Must match worker upstream host (eu.i.posthog.com). */
export const POSTHOG_HOST = "https://eu.i.posthog.com";

/** Stable distinct id for Cloud Functions exception events (not end-user identity). */
export const FUNCTIONS_EXCEPTION_DISTINCT_ID = "jetlag-functions";

/**
 * Deterministic UUIDv4-shaped id from an opaque seed (Stripe event id, etc.).
 * @param {string} seed
 */
export function uuidFromSeed(seed) {
  const hex = createHash("sha256").update(seed).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

/**
 * @param {{
 *   apiKey: string,
 *   distinctId: string,
 *   event: string,
 *   uuidSeed: string,
 *   properties?: Record<string, unknown>,
 *   captureImpl?: { capture: Function, shutdown: Function },
 *   host?: string,
 * }} input
 */
export async function captureAnalyticsEvent(input) {
  const { apiKey, distinctId, event, uuidSeed, properties = {}, host = POSTHOG_HOST } = input;
  if (!apiKey || !distinctId || !event || !uuidSeed) {
    return;
  }

  let client;
  try {
    client =
      input.captureImpl ??
      new PostHog(apiKey, {
        host,
        flushAt: 1,
        flushInterval: 0,
      });

    await Promise.resolve(
      client.capture({
        distinctId,
        event,
        uuid: uuidFromSeed(uuidSeed),
        properties,
      }),
    );
    await client.shutdown();
  } catch {
    // Soft-fail: analytics must never break Stripe / idle jobs.
    try {
      await client?.shutdown?.();
    } catch {
      // ignore
    }
  }
}

/** @type {import("posthog-node").PostHog | null} */
let exceptionClient = null;
/** @type {string | null} */
let exceptionClientKey = null;

/**
 * Test-only: drop the module-level exception client.
 */
export function resetFunctionsExceptionClientForTests() {
  exceptionClient = null;
  exceptionClientKey = null;
}

/**
 * @param {{
 *   apiKey?: string,
 *   host?: string,
 *   clientImpl?: {
 *     captureException?: Function,
 *     captureExceptionImmediate?: Function,
 *     flush?: Function,
 *   },
 * }} [options]
 */
export function getOrCreateFunctionsExceptionClient(options = {}) {
  if (options.clientImpl) {
    return options.clientImpl;
  }

  let apiKey = options.apiKey;
  if (!apiKey) {
    try {
      apiKey = posthogProjectApiKey.value();
    } catch {
      return null;
    }
  }
  if (!apiKey) {
    return null;
  }

  if (exceptionClient && exceptionClientKey === apiKey) {
    return exceptionClient;
  }

  const host = options.host ?? POSTHOG_HOST;
  exceptionClient = new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
  exceptionClientKey = apiKey;
  return exceptionClient;
}

/**
 * Soft-fail PostHog exception capture for Cloud Functions.
 * Prefer captureExceptionImmediate when available so flush races do not drop events.
 *
 * @param {{
 *   error: unknown,
 *   distinctId?: string,
 *   properties?: Record<string, unknown>,
 *   apiKey?: string,
 *   host?: string,
 *   clientImpl?: {
 *     captureException?: Function,
 *     captureExceptionImmediate?: Function,
 *     flush?: Function,
 *   },
 * }} input
 */
export async function capturePosthogException(input) {
  const {
    error,
    distinctId = FUNCTIONS_EXCEPTION_DISTINCT_ID,
    properties = {},
    apiKey,
    host,
    clientImpl,
  } = input;

  try {
    const client = getOrCreateFunctionsExceptionClient({ apiKey, host, clientImpl });
    if (!client) {
      return;
    }

    if (typeof client.captureExceptionImmediate === "function") {
      await client.captureExceptionImmediate(error, distinctId, properties);
      return;
    }

    if (typeof client.captureException === "function") {
      client.captureException(error, distinctId, properties);
      if (typeof client.flush === "function") {
        await client.flush();
      }
    }
  } catch {
    // Soft-fail: exception capture must never break callables.
  }
}
