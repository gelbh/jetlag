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

  it("drops soft App Check throttle, probe timeout, and fetch-network-error", () => {
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
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "AppCheck: Fetch failed to connect to a network. Check Internet connection. Original error: Load failed (content-firebaseappcheck.googleapis.com). (appCheck/fetch-network-error).",
        ),
      ),
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

  it("drops IDB closing/hidden and Safari object-store lookup noise", () => {
    expect(
      classifyClientSentryEvent(
        exc("InvalidStateError", "Database is closing/hidden"),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent(
        exc(
          "UnknownError",
          "Error looking up record in object store by key range",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent({ message: "Database is closing/hidden" }),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent({
        message: "Error looking up record in object store by key range",
      }),
    ).toBe("drop");
  });

  it("drops view-transition abort and visibility-hidden skips", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "InvalidStateError",
          "Transition was aborted because of invalid state",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent(
        exc(
          "InvalidStateError",
          "Skipping view transition because document visibility state has become hidden.",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientSentryEvent({
        message:
          "Skipping view transition because document visibility state has become hidden.",
      }),
    ).toBe("drop");
  });

  it("sends Firestore missing-or-insufficient-permissions (reopened)", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "Missing or insufficient permissions.",
        ),
      ),
    ).toBe("send");
  });

  it("sends storage/unauthorized (reopened)", () => {
    expect(
      classifyClientSentryEvent(
        exc(
          "FirebaseError",
          "Firebase Storage: User does not have permission to access 'sessions/x/photo.jpg'. (storage/unauthorized)",
        ),
      ),
    ).toBe("send");
  });

  it("drops expected join permission-denied captureMessage", () => {
    expect(
      classifyClientSentryEvent({
        message: "Join permission denied",
        level: "warning",
      }),
    ).toBe("drop");
  });

  it("drops Task 1 expected join UX messages (client denylist belt)", () => {
    // Production fixtures — mirror functions/handlers/session/shared.mjs HTTPS_MSG_*.
    const fixtures = [
      "Wrong role code.",
      "Role code is required.",
      "App version incompatible.",
      "Join without a request — this side is empty.",
      "Join request is not pending.",
      "Join request expired.",
      "Invalid join request.",
      "Not allowed for this join request.",
      "Session uses legacy join.",
    ];
    for (const message of fixtures) {
      expect(classifyClientSentryEvent(exc("FirebaseError", message))).toBe(
        "drop",
      );
      expect(classifyClientSentryEvent({ message })).toBe("drop");
    }
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

  it("does not denylist isCorePipeline, getImage, deadline-exceeded, or dynamic import failures", () => {
    expect(
      classifyClientSentryEvent(
        exc("TypeError", "Cannot read properties of null (reading 'isCorePipeline')"),
      ),
    ).toBe("send");
    expect(
      classifyClientSentryEvent(
        exc(
          "TypeError",
          "Cannot read properties of undefined (reading 'getImage')",
        ),
      ),
    ).toBe("send");
    expect(
      classifyClientSentryEvent(
        exc("FirebaseError", "deadline-exceeded"),
      ),
    ).toBe("send");
    expect(
      classifyClientSentryEvent(
        exc("TypeError", "Failed to fetch dynamically imported module"),
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
