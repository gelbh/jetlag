import type { CaptureResult } from "posthog-js";
import {
  applyClientExceptionDisposition,
  type ClientExceptionEventLike,
  classifyClientExceptionEvent,
} from "./clientExceptionPolicy";

function toClientExceptionEventLike(
  properties: CaptureResult["properties"],
): ClientExceptionEventLike {
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
  if (!capture || capture.event !== "$exception") {
    return capture;
  }

  const policyEvent = toClientExceptionEventLike(capture.properties);
  const next = applyClientExceptionDisposition(
    policyEvent,
    classifyClientExceptionEvent(policyEvent),
    random,
  );
  if (!next) {
    return null;
  }

  if (next.fingerprint) {
    capture.properties.$exception_fingerprint = next.fingerprint.join(":");
  }
  if (next.level) {
    capture.properties.$exception_level = next.level;
  }
  return capture;
}
