/**
 * PostHog `before_send` for `$exception` events.
 * Reuses the client Sentry drop / keep / meter matrix so both reporters share one noise definition.
 */
import type { CaptureResult } from "posthog-js";
import {
  applyClientSentryDisposition,
  classifyClientSentryEvent,
  type SentryEventLike,
} from "./sentryEventPolicy";

function toSentryEventLike(properties: CaptureResult["properties"]): SentryEventLike {
  const list: unknown = properties.$exception_list;
  const values = Array.isArray(list)
    ? list.map((entry: unknown) => {
        const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
        return {
          type: typeof record.type === "string" ? record.type : undefined,
          value: typeof record.value === "string" ? record.value : undefined,
        };
      })
    : [];
  return { exception: { values } };
}

export function filterPosthogException(
  capture: CaptureResult | null,
  random: () => number = Math.random,
): CaptureResult | null {
  if (capture?.event !== "$exception") {
    return capture;
  }

  const policyEvent = toSentryEventLike(capture.properties);
  const next = applyClientSentryDisposition(
    policyEvent,
    classifyClientSentryEvent(policyEvent),
    random,
  );
  if (!next) {
    return null;
  }

  // meter_quota: mirror Sentry's grouping + level via PostHog's custom exception properties.
  if (next.fingerprint) {
    capture.properties.$exception_fingerprint = next.fingerprint.join(":");
  }
  if (next.level) {
    capture.properties.$exception_level = next.level;
  }
  return capture;
}
