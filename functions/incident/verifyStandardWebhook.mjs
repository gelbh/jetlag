import { createHmac, timingSafeEqual } from "node:crypto";

export const STANDARD_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function header(headers, name) {
  const value = headers?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Verify a Standard Webhooks (https://www.standardwebhooks.com) request, as sent by
 * PostHog's webhook destination when `signing_secret` is set.
 * Secret format: `whsec_<base64 key>`.
 */
export function verifyStandardWebhook({ secret, headers, rawBody, nowMs = Date.now() }) {
  if (typeof secret !== "string" || !secret.startsWith("whsec_")) {
    return false;
  }
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatures = header(headers, "webhook-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) {
    return false;
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > STANDARD_WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  if (key.length === 0) {
    return false;
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody ?? "");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) {
      return false;
    }
    const candidate = Buffer.from(signature, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}
