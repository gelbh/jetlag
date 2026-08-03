import { describe, expect, it } from "vitest";
import {
  applyClientSentryDisposition,
  classifyClientSentryEvent,
  QUOTA_SAMPLE_RATE,
  type SentryEventLike,
} from "./sentryEventPolicy";

function exc(type: string, value: string): SentryEventLike {
  return { exception: { values: [{ type, value }] } };
}

describe("classifyClientSentryEvent", () => {
  it("meters QuotaExceededError with quota message", () => {
    expect(
      classifyClientSentryEvent(
        exc("QuotaExceededError", "The quota has been exceeded."),
      ),
    ).toBe("meter_quota");
    expect(
      classifyClientSentryEvent(
        exc(
          "QuotaExceededError",
          "Failed to execute 'setItem' on 'Storage': Setting the value of 'jetlag-annotations' exceeded the quota.",
        ),
      ),
    ).toBe("meter_quota");
  });

  it("drops AbortError aborted operation", () => {
    expect(
      classifyClientSentryEvent(
        exc("AbortError", "This operation was aborted"),
      ),
    ).toBe("drop");
  });

  it("drops soft App Check throttle and probe timeout", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "AppCheck: Requests throttled due to previous 403 error. Attempts allowed again after 20h:49m:23s (appCheck/throttled).",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent(exc("Error", "App Check probe timed out")),
    ).toBe("drop");
  });

  it("drops expected leave messages", () => {
    expect(
      classifyClientSentryEvent(exc("Error", "Session already ended.")),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent(exc("Error", "Only the host can do that.")),
    ).toBe("drop");
  });

  it("drops Firestore b815 persistence noise", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "Error",
          'FIRESTORE (12.16.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"el":"Error storing new key generator value in database"}',
        ),
      ),
    ).toBe("drop");
  });

  it("drops Firestore permission-denied", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "Missing or insufficient permissions.",
        ),
      ),
    ).toBe("drop");
  });

  it("drops expected join permission-denied captureMessage", () => {
    expect(
      classifyClientSentryEvent({
        message: "Join permission denied",
        level: "warning",
      }),
    ).toBe("drop");
  });

  it("keeps module script import failure and WebKit Load failed", () => {
    expect(
      classifyClientSentryEvent(
        exc("TypeError", "Importing a module script failed."),
      ),
    ).toBe("send");
    expect(classifyClientSentryEvent(exc("TypeError", "Load failed"))).toBe(
      "send",
    );
    expect(
      classifyClientSentryEvent(
        exc("TypeError", "Load failed (jetlag.gelbhart.dev)"),
      ),
    ).toBe("send");
  });
});

describe("applyClientSentryDisposition", () => {
  it("samples quota at rate and fingerprints", () => {
    const event = exc("QuotaExceededError", "The quota has been exceeded.");
    const justBelow = Math.max(0, QUOTA_SAMPLE_RATE - Number.EPSILON);
    const sent = applyClientSentryDisposition(
      event,
      "meter_quota",
      () => justBelow,
    );
    expect(sent).not.toBeNull();
    expect(sent?.fingerprint).toEqual(["storage-quota-exceeded"]);
    expect(sent?.level).toBe("warning");
    const atRate = applyClientSentryDisposition(
      event,
      "meter_quota",
      () => QUOTA_SAMPLE_RATE,
    );
    expect(atRate).toBeNull();
    const above = applyClientSentryDisposition(
      event,
      "meter_quota",
      () => QUOTA_SAMPLE_RATE + 0.01,
    );
    expect(above).toBeNull();
  });
});
