import { describe, expect, it } from "vitest";
import {
  applyClientExceptionDisposition,
  type ClientExceptionEventLike,
  classifyClientExceptionEvent,
  QUOTA_SAMPLE_RATE,
} from "./clientExceptionPolicy";

function exc(type: string, value: string): ClientExceptionEventLike {
  return { exception: { values: [{ type, value }] } };
}

describe("classifyClientExceptionEvent", () => {
  it("meters QuotaExceededError with quota message", () => {
    expect(
      classifyClientExceptionEvent(exc("QuotaExceededError", "The quota has been exceeded.")),
    ).toBe("meter_quota");
    expect(
      classifyClientExceptionEvent(
        exc(
          "QuotaExceededError",
          "Failed to execute 'setItem' on 'Storage': Setting the value of 'jetlag-annotations' exceeded the quota.",
        ),
      ),
    ).toBe("meter_quota");
  });

  it("drops AbortError aborted operation", () => {
    expect(classifyClientExceptionEvent(exc("AbortError", "This operation was aborted"))).toBe(
      "drop",
    );
  });

  it("drops IndexedDbTransactionError createOrUpgrade abort (JETLAG-41)", () => {
    expect(
      classifyClientExceptionEvent(
        exc(
          "IndexedDbTransactionError",
          "IndexedDB transaction 'createOrUpgrade' failed: AbortError: The operation was aborted.",
        ),
      ),
    ).toBe("drop");
  });

  it("drops soft App Check throttle, probe timeout, and fetch-network-error", () => {
    expect(
      classifyClientExceptionEvent(
        exc(
          "FirebaseError",
          "AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientExceptionEvent(
        exc(
          "FirebaseError",
          "AppCheck: Requests throttled due to previous 403 error. Attempts allowed again after 20h:49m:23s (appCheck/throttled).",
        ),
      ),
    ).toBe("drop");
    expect(classifyClientExceptionEvent(exc("Error", "App Check probe timed out"))).toBe("drop");
    expect(
      classifyClientExceptionEvent(
        exc(
          "FirebaseError",
          "AppCheck: Fetch failed to connect to a network. Check Internet connection. Original error: Load failed (content-firebaseappcheck.googleapis.com). (appCheck/fetch-network-error).",
        ),
      ),
    ).toBe("drop");
  });

  it("drops expected leave messages", () => {
    expect(classifyClientExceptionEvent(exc("Error", "Session already ended."))).toBe("drop");
    expect(classifyClientExceptionEvent(exc("Error", "Only the host can do that."))).toBe("drop");
  });

  it("drops Firestore b815 persistence noise", () => {
    expect(
      classifyClientExceptionEvent(
        exc(
          "Error",
          'FIRESTORE (12.16.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"el":"Error storing new key generator value in database"}',
        ),
      ),
    ).toBe("drop");
  });

  it("drops IDB closing/hidden and Safari object-store lookup noise", () => {
    expect(
      classifyClientExceptionEvent(exc("InvalidStateError", "Database is closing/hidden")),
    ).toBe("drop");
    expect(
      classifyClientExceptionEvent(
        exc("UnknownError", "Error looking up record in object store by key range"),
      ),
    ).toBe("drop");
    expect(classifyClientExceptionEvent({ message: "Database is closing/hidden" })).toBe("drop");
    expect(
      classifyClientExceptionEvent({
        message: "Error looking up record in object store by key range",
      }),
    ).toBe("drop");
  });

  it("drops view-transition abort and visibility-hidden skips", () => {
    expect(
      classifyClientExceptionEvent(
        exc("InvalidStateError", "Transition was aborted because of invalid state"),
      ),
    ).toBe("drop");
    expect(
      classifyClientExceptionEvent(
        exc(
          "InvalidStateError",
          "Skipping view transition because document visibility state has become hidden.",
        ),
      ),
    ).toBe("drop");
    expect(
      classifyClientExceptionEvent({
        message: "Skipping view transition because document visibility state has become hidden.",
      }),
    ).toBe("drop");
  });

  it("drops view transition skipped wording (JETLAG-3V)", () => {
    expect(classifyClientExceptionEvent(exc("Error", "AbortError: Transition was skipped"))).toBe(
      "drop",
    );
  });

  it("drops Firefox Firestore IDB NS_ERROR_FAILURE noise (JETLAG-3Z)", () => {
    expect(classifyClientExceptionEvent(exc("NS_ERROR_FAILURE", "No error message"))).toBe("drop");
    expect(classifyClientExceptionEvent(exc("Error", "NS_ERROR_FAILURE: No error message"))).toBe(
      "drop",
    );
  });

  it("drops IDB index lookup without in-progress transaction (JETLAG-3S)", () => {
    expect(
      classifyClientExceptionEvent(
        exc(
          "UnknownError",
          "Attempt to get all index records from database without an in-progress transaction",
        ),
      ),
    ).toBe("drop");
  });

  it("sends Firestore missing-or-insufficient-permissions (reopened)", () => {
    expect(
      classifyClientExceptionEvent(exc("FirebaseError", "Missing or insufficient permissions.")),
    ).toBe("send");
  });

  it("sends storage/unauthorized (reopened)", () => {
    expect(
      classifyClientExceptionEvent(
        exc(
          "FirebaseError",
          "Firebase Storage: User does not have permission to access 'sessions/x/photo.jpg'. (storage/unauthorized)",
        ),
      ),
    ).toBe("send");
  });

  it("drops expected join permission-denied captureMessage", () => {
    expect(
      classifyClientExceptionEvent({
        message: "Join permission denied",
        level: "warning",
      }),
    ).toBe("drop");
  });

  it("drops Task 1 expected join UX messages (client denylist belt)", () => {
    // Production fixtures — mirror functions/session/expectedSessionUxHttpsErrors.mjs.
    const fixtures = [
      "Wrong role code.",
      "Role code is required.",
      "App version incompatible.",
      "Client update required.",
      "Join without a request — this side is empty.",
      "Join request is not pending.",
      "Join request expired.",
      "Invalid join request.",
      "Not allowed for this join request.",
      "Session uses legacy join.",
    ];
    for (const message of fixtures) {
      expect(classifyClientExceptionEvent(exc("FirebaseError", message))).toBe("drop");
      expect(classifyClientExceptionEvent({ message })).toBe("drop");
      expect(
        classifyClientExceptionEvent({
          message: `failed-precondition ${message}`,
        }),
      ).toBe("drop");
    }
  });

  it("keeps module script import failure and WebKit Load failed", () => {
    expect(
      classifyClientExceptionEvent(exc("TypeError", "Importing a module script failed.")),
    ).toBe("send");
    expect(classifyClientExceptionEvent(exc("TypeError", "Load failed"))).toBe("send");
    expect(
      classifyClientExceptionEvent(exc("TypeError", "Load failed (jetlag.gelbhart.dev)")),
    ).toBe("send");
  });

  it("does not denylist isCorePipeline, getImage, deadline-exceeded, or dynamic import failures", () => {
    expect(
      classifyClientExceptionEvent(
        exc("TypeError", "Cannot read properties of null (reading 'isCorePipeline')"),
      ),
    ).toBe("send");
    expect(
      classifyClientExceptionEvent(
        exc("TypeError", "Cannot read properties of undefined (reading 'getImage')"),
      ),
    ).toBe("send");
    expect(classifyClientExceptionEvent(exc("FirebaseError", "deadline-exceeded"))).toBe("send");
    expect(
      classifyClientExceptionEvent(exc("TypeError", "Failed to fetch dynamically imported module")),
    ).toBe("send");
  });
});

describe("applyClientExceptionDisposition", () => {
  it("samples quota at rate and fingerprints", () => {
    const event = exc("QuotaExceededError", "The quota has been exceeded.");
    const justBelow = Math.max(0, QUOTA_SAMPLE_RATE - Number.EPSILON);
    const sent = applyClientExceptionDisposition(event, "meter_quota", () => justBelow);
    expect(sent).not.toBeNull();
    expect(sent?.fingerprint).toEqual(["storage-quota-exceeded"]);
    expect(sent?.level).toBe("warning");
    const atRate = applyClientExceptionDisposition(event, "meter_quota", () => QUOTA_SAMPLE_RATE);
    expect(atRate).toBeNull();
    const above = applyClientExceptionDisposition(
      event,
      "meter_quota",
      () => QUOTA_SAMPLE_RATE + 0.01,
    );
    expect(above).toBeNull();
  });
});
