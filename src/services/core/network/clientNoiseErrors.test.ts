import { describe, expect, it } from "vitest";
import {
  classifyAppCheckProbeFailure,
  isAppCheckSoftFailureMessage,
  isBrowserExtensionNoiseMessage,
  isFirestoreIdbObjectStoreLookupNoiseMessage,
  isFirestoreIdbPersistenceNoiseMessage,
  isIdbConnectionClosingMessage,
  isRecaptchaOtTypeErrorMessage,
  isRecaptchaTimeoutMessage,
  isWebkitLoadFailedMessage,
} from "./clientNoiseErrors";

describe("isIdbConnectionClosingMessage", () => {
  it("matches Firebase Auth closing-connection InvalidStateError text", () => {
    expect(
      isIdbConnectionClosingMessage(
        "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
      ),
    ).toBe(true);
  });

  it("matches Chrome iOS Firebase Auth Database is closing/hidden", () => {
    expect(
      isIdbConnectionClosingMessage("Database is closing/hidden"),
    ).toBe(true);
  });

  it("ignores unrelated messages", () => {
    expect(
      isIdbConnectionClosingMessage("Database deleted by request of the user"),
    ).toBe(false);
  });
});

describe("isWebkitLoadFailedMessage", () => {
  it("matches Safari Load failed with optional host suffix", () => {
    expect(isWebkitLoadFailedMessage("Load failed")).toBe(true);
    expect(isWebkitLoadFailedMessage("Load failed (jetlag.gelbhart.dev)")).toBe(
      true,
    );
  });

  it("trims whitespace before matching", () => {
    expect(isWebkitLoadFailedMessage("  Load failed  ")).toBe(true);
  });

  it("ignores other messages", () => {
    expect(isWebkitLoadFailedMessage("Failed to fetch")).toBe(false);
    expect(isWebkitLoadFailedMessage("Load failed to fetch")).toBe(false);
  });
});

describe("isRecaptchaOtTypeErrorMessage", () => {
  it("matches Chrome/Safari reCAPTCHA oT property access TypeErrors", () => {
    expect(
      isRecaptchaOtTypeErrorMessage(
        "Cannot read properties of null (reading 'oT')",
      ),
    ).toBe(true);
    expect(
      isRecaptchaOtTypeErrorMessage(
        "null is not an object (evaluating 'a.oT')",
      ),
    ).toBe(true);
  });

  it("ignores unrelated TypeError messages", () => {
    expect(
      isRecaptchaOtTypeErrorMessage("Cannot read properties of null (reading 'x')"),
    ).toBe(false);
    expect(isRecaptchaOtTypeErrorMessage("Load failed")).toBe(false);
  });
});

describe("isFirestoreIdbPersistenceNoiseMessage", () => {
  it("matches Firestore b815 / key-generator persistence failures", () => {
    expect(
      isFirestoreIdbPersistenceNoiseMessage(
        'FIRESTORE (12.16.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"el":"Error storing new key generator value in database"}',
      ),
    ).toBe(true);
    expect(
      isFirestoreIdbPersistenceNoiseMessage(
        "ConstraintError: Error storing new key generator value in database",
      ),
    ).toBe(true);
  });

  it("ignores unrelated Firestore errors", () => {
    expect(
      isFirestoreIdbPersistenceNoiseMessage("Missing or insufficient permissions."),
    ).toBe(false);
  });
});

describe("isFirestoreIdbObjectStoreLookupNoiseMessage", () => {
  it("matches Safari UnknownError object-store key-range lookup", () => {
    expect(
      isFirestoreIdbObjectStoreLookupNoiseMessage(
        "UnknownError: Error looking up record in object store by key range",
      ),
    ).toBe(true);
    expect(
      isFirestoreIdbObjectStoreLookupNoiseMessage(
        "Error looking up record in object store by key range",
      ),
    ).toBe(true);
  });

  it("ignores unrelated object-store messages", () => {
    expect(
      isFirestoreIdbObjectStoreLookupNoiseMessage(
        "Failed to delete record from object store",
      ),
    ).toBe(false);
  });
});

describe("isRecaptchaTimeoutMessage", () => {
  it("matches Google reCAPTCHA Timeout errors", () => {
    expect(isRecaptchaTimeoutMessage("reCAPTCHA Timeout (b)")).toBe(true);
  });

  it("ignores unrelated timeouts", () => {
    expect(isRecaptchaTimeoutMessage("App Check probe timed out")).toBe(false);
  });
});

describe("isBrowserExtensionNoiseMessage", () => {
  it("matches extension sendMessage and Object Not Found injector noise", () => {
    expect(
      isBrowserExtensionNoiseMessage(
        "Invalid call to runtime.sendMessage(). Tab not found.",
      ),
    ).toBe(true);
    expect(
      isBrowserExtensionNoiseMessage(
        "Object Not Found Matching Id:1, MethodName:update, ParamCount:4",
      ),
    ).toBe(true);
  });

  it("ignores first-party messages", () => {
    expect(isBrowserExtensionNoiseMessage("Couldn't leave the session.")).toBe(
      false,
    );
  });
});

describe("isAppCheckSoftFailureMessage", () => {
  it("matches probe timeout, initial-throttle, throttled, fetch-network, and reCAPTCHA Timeout", () => {
    expect(isAppCheckSoftFailureMessage("App Check probe timed out")).toBe(true);
    expect(
      isAppCheckSoftFailureMessage(
        "AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).",
      ),
    ).toBe(true);
    expect(
      isAppCheckSoftFailureMessage(
        "AppCheck: Requests throttled due to previous 403 error. Attempts allowed again after 20h:49m:23s (appCheck/throttled).",
      ),
    ).toBe(true);
    expect(
      isAppCheckSoftFailureMessage(
        "FirebaseError: AppCheck: Fetch failed to connect to a network. Check Internet connection. Original error: Load failed (content-firebaseappcheck.googleapis.com). (appCheck/fetch-network-error).",
      ),
    ).toBe(true);
    expect(isAppCheckSoftFailureMessage("reCAPTCHA Timeout (b)")).toBe(true);
  });

  it("ignores hard App Check failures and bare throttle substrings", () => {
    expect(
      isAppCheckSoftFailureMessage("App Check probe returned empty token"),
    ).toBe(false);
    expect(isAppCheckSoftFailureMessage("initial-throttle alone")).toBe(false);
    expect(isAppCheckSoftFailureMessage("throttled alone")).toBe(false);
  });
});

describe("classifyAppCheckProbeFailure", () => {
  it("classifies timeout and empty token", () => {
    expect(classifyAppCheckProbeFailure("timeout")).toEqual({
      soft: true,
      reason: "timeout",
      allowApp: true,
    });
    expect(classifyAppCheckProbeFailure("empty")).toEqual({
      soft: false,
      reason: "blocked",
      allowApp: false,
    });
  });

  it("classifies throttle, reCAPTCHA timeout, blocked fetch, and unknown soft errors", () => {
    expect(
      classifyAppCheckProbeFailure({
        message:
          "AppCheck: 403 error. Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle).",
      }),
    ).toEqual({ soft: true, reason: "error", allowApp: true });
    expect(
      classifyAppCheckProbeFailure({ message: "reCAPTCHA Timeout (b)" }),
    ).toEqual({ soft: true, reason: "error", allowApp: true });
    expect(
      classifyAppCheckProbeFailure({
        message:
          "FirebaseError: AppCheck: Fetch failed to connect to a network. Check Internet connection. Original error: Load failed (content-firebaseappcheck.googleapis.com). (appCheck/fetch-network-error).",
      }),
    ).toEqual({ soft: true, reason: "error", allowApp: true });
    expect(
      classifyAppCheckProbeFailure({ message: "Failed to fetch" }),
    ).toEqual({ soft: false, reason: "blocked", allowApp: false });
    expect(
      classifyAppCheckProbeFailure({ message: "Load failed" }),
    ).toEqual({ soft: false, reason: "blocked", allowApp: false });
    expect(
      classifyAppCheckProbeFailure({
        message: "App Check request blocked by a content blocker",
      }),
    ).toEqual({ soft: false, reason: "blocked", allowApp: false });
    expect(
      classifyAppCheckProbeFailure({ message: "unblocked-after-retry" }),
    ).toEqual({ soft: true, reason: "error", allowApp: true });
    expect(
      classifyAppCheckProbeFailure({ message: "Internal App Check glitch" }),
    ).toEqual({ soft: true, reason: "error", allowApp: true });
  });
});

