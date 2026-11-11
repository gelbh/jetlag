import type { CaptureResult } from "posthog-js";
import { readAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import { enrichFirebaseExceptionProperties } from "./firebaseExceptionEnrich";
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
    const enriched =
      enrichFirebaseExceptionProperties((capture.properties ?? {}) as Record<string, unknown>) ??
      (capture.properties as Record<string, unknown> | undefined) ??
      {};
    const scrubbed: CaptureResult = {
      ...capture,
      properties: scrubPosthogExceptionProperties(enriched) ?? enriched,
    };
    return filterPosthogException(scrubbed, random);
  }

  if (readAnalyticsConsent() !== "granted") {
    return null;
  }

  return capture;
}
