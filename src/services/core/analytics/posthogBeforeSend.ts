/**
 * PostHog `before_send`: ungated scrubbed `$exception`, Accept-gated product events.
 * Compose over `filterPosthogException`; do not call `opt_out_capturing` for Deny.
 */
import type { CaptureResult } from "posthog-js";
import { readAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import { filterPosthogException } from "./posthogExceptionPolicy";
import { scrubPosthogExceptionProperties } from "./telemetryScrub";

export function posthogBeforeSend(
  capture: CaptureResult | null,
  random: () => number = Math.random,
): CaptureResult | null {
  if (!capture) {
    return null;
  }

  if (capture.event === "$exception") {
    const scrubbed: CaptureResult = {
      ...capture,
      properties: scrubPosthogExceptionProperties(capture.properties) ?? capture.properties,
    };
    return filterPosthogException(scrubbed, random);
  }

  if (readAnalyticsConsent() !== "granted") {
    return null;
  }

  return capture;
}
