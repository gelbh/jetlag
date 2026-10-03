import { createHash } from "node:crypto";
import { PostHog } from "posthog-node";
import { defineSecret } from "firebase-functions/params";

export const posthogProjectApiKey = defineSecret("POSTHOG_PROJECT_API_KEY");

/** Must match worker upstream host (eu.i.posthog.com). */
export const POSTHOG_HOST = "https://eu.i.posthog.com";

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

  const client =
    input.captureImpl ??
    new PostHog(apiKey, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });

  try {
    client.capture({
      distinctId,
      event,
      uuid: uuidFromSeed(uuidSeed),
      properties,
    });
    await client.shutdown();
  } catch {
    // Soft-fail: analytics must never break Stripe / idle jobs.
    try {
      await client.shutdown?.();
    } catch {
      // ignore
    }
  }
}
