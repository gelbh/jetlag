import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { filterPosthogException } from "./posthogExceptionPolicy";
import { QUOTA_SAMPLE_RATE } from "./sentryEventPolicy";

function exceptionCapture(type: string, value: string): CaptureResult {
  return {
    uuid: "test-uuid",
    event: "$exception",
    properties: {
      $exception_list: [
        {
          type,
          value,
          mechanism: { handled: false, synthetic: true, type: "generic" },
        },
      ],
    },
  };
}

describe("filterPosthogException", () => {
  it("passes through non-exception events and null", () => {
    const pageview: CaptureResult = {
      uuid: "test-uuid",
      event: "$pageview",
      properties: { path: "/map" },
    };
    expect(filterPosthogException(pageview)).toBe(pageview);
    expect(filterPosthogException(null)).toBeNull();
  });

  it("drops exceptions the shared client policy classifies as noise", () => {
    expect(
      filterPosthogException(exceptionCapture("AbortError", "This operation was aborted")),
    ).toBeNull();
    expect(
      filterPosthogException(exceptionCapture("FirebaseError", "Session already ended.")),
    ).toBeNull();
    expect(
      filterPosthogException(
        exceptionCapture(
          "FirebaseError",
          "AppCheck: Requests throttled due to previous 403 error. Attempts allowed again after 20h:49m:23s (appCheck/throttled).",
        ),
      ),
    ).toBeNull();
  });

  it("keeps Firestore permission-denied (Sentry policy sends it too)", () => {
    const capture = exceptionCapture("FirebaseError", "Missing or insufficient permissions.");
    expect(filterPosthogException(capture)).toBe(capture);
  });

  it("keeps real errors untouched", () => {
    const capture = exceptionCapture("TypeError", "Importing a module script failed.");
    expect(filterPosthogException(capture)).toBe(capture);
    expect(capture.properties.$exception_fingerprint).toBeUndefined();
  });

  it("samples storage quota and groups kept events", () => {
    const quota = () => exceptionCapture("QuotaExceededError", "The quota has been exceeded.");

    expect(filterPosthogException(quota(), () => QUOTA_SAMPLE_RATE)).toBeNull();

    const kept = filterPosthogException(quota(), () => 0);
    expect(kept?.properties.$exception_fingerprint).toBe("storage-quota-exceeded");
    expect(kept?.properties.$exception_level).toBe("warning");
  });

  it("keeps exceptions without a readable exception list", () => {
    const capture: CaptureResult = {
      uuid: "test-uuid",
      event: "$exception",
      properties: {},
    };
    expect(filterPosthogException(capture)).toBe(capture);
  });
});
