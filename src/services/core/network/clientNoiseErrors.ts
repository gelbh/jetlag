/** Chrome IDB "connection is closing" + Firebase Auth iOS "Database is closing/hidden". */
const IDB_CONNECTION_CLOSING =
  /database(?: connection)? is closing(?:\/hidden)?/i;
const WEBKIT_LOAD_FAILED = /^Load failed(?:\s*\([^)]*\))?$/i;
const RECAPTCHA_OT_TYPEERROR =
  /(?:reading ['"]oT['"]|evaluating ['"][^'"]*\.oT['"])/i;
const FIRESTORE_IDB_PERSISTENCE =
  /INTERNAL ASSERTION FAILED:[\s\S]*\bID:\s*b815\b|Error storing new key generator value in database/i;
/** Safari Firestore IDB: UnknownError looking up object-store records by key range. */
const FIRESTORE_IDB_OBJECT_STORE_LOOKUP =
  /looking up record in object store by key range/i;
const RECAPTCHA_TIMEOUT = /^reCAPTCHA Timeout\s*\(/i;
const BROWSER_EXTENSION_NOISE =
  /Invalid call to runtime\.sendMessage\(\)|Object Not Found Matching Id:/i;
/** Soft App Check backoff codes (initial-throttle after 403, later throttled). */
const APP_CHECK_SOFT_THROTTLE = /appCheck\/(?:initial-throttle|throttled)/i;
/** Transient network disconnect while contacting App Check (not content-blocker). */
const APP_CHECK_FETCH_NETWORK = /appCheck\/fetch-network-error/i;
const APP_CHECK_PROBE_TIMED_OUT = /App Check probe timed out/i;
const APP_CHECK_BLOCKED_FETCH =
  /failed to fetch|load failed|content[\s-]?blocker|ad[\s-]?blocker|request blocked/i;

export function isIdbConnectionClosingMessage(message: string): boolean {
  return IDB_CONNECTION_CLOSING.test(message);
}

export function isWebkitLoadFailedMessage(message: string): boolean {
  return WEBKIT_LOAD_FAILED.test(message.trim());
}

/** Third-party Google reCAPTCHA minified TypeError (e.g. Safari App Check). */
export function isRecaptchaOtTypeErrorMessage(message: string): boolean {
  return RECAPTCHA_OT_TYPEERROR.test(message);
}

/** Firestore IndexedDB persistence races (Safari pagehide / key-generator). */
export function isFirestoreIdbPersistenceNoiseMessage(message: string): boolean {
  return FIRESTORE_IDB_PERSISTENCE.test(message);
}

/** Safari Firestore IndexedDB object-store key-range lookup failures. */
export function isFirestoreIdbObjectStoreLookupNoiseMessage(
  message: string,
): boolean {
  return FIRESTORE_IDB_OBJECT_STORE_LOOKUP.test(message);
}

/** Google reCAPTCHA script timeout string. */
export function isRecaptchaTimeoutMessage(message: string): boolean {
  return RECAPTCHA_TIMEOUT.test(message.trim());
}

/** Browser extension / injector noise leaking into the page. */
export function isBrowserExtensionNoiseMessage(message: string): boolean {
  return BROWSER_EXTENSION_NOISE.test(message);
}

/** Firebase App Check soft throttle error codes in the message. */
export function isAppCheckInitialThrottleMessage(message: string): boolean {
  return APP_CHECK_SOFT_THROTTLE.test(message);
}

export function isAppCheckFetchNetworkErrorMessage(message: string): boolean {
  return APP_CHECK_FETCH_NETWORK.test(message);
}

/**
 * Soft App Check probe outcomes that must not land as Sentry errors
 * (beforeSend safety net for uncaught leftovers).
 */
export function isAppCheckSoftFailureMessage(message: string): boolean {
  return (
    APP_CHECK_PROBE_TIMED_OUT.test(message) ||
    isAppCheckInitialThrottleMessage(message) ||
    isAppCheckFetchNetworkErrorMessage(message) ||
    isRecaptchaTimeoutMessage(message)
  );
}

/** Content-blocker load/fetch failures that should hard-block the app. */
export function isAppCheckBlockedFetchMessage(message: string): boolean {
  return APP_CHECK_BLOCKED_FETCH.test(message);
}

export type AppCheckProbeFailureClass =
  | { soft: true; reason: "timeout" | "error"; allowApp: true }
  | { soft: false; reason: "blocked"; allowApp: false };

/** Single classifier for App Check probe soft vs hard outcomes. */
export function classifyAppCheckProbeFailure(
  outcome: "timeout" | "empty" | { message: string },
): AppCheckProbeFailureClass {
  if (outcome === "timeout") {
    return { soft: true, reason: "timeout", allowApp: true };
  }
  if (outcome === "empty") {
    return { soft: false, reason: "blocked", allowApp: false };
  }
  if (isAppCheckInitialThrottleMessage(outcome.message)) {
    return { soft: true, reason: "error", allowApp: true };
  }
  // Transient App Check network errors include "Load failed" substrings that
  // would otherwise match APP_CHECK_BLOCKED_FETCH — classify soft first.
  if (isAppCheckFetchNetworkErrorMessage(outcome.message)) {
    return { soft: true, reason: "error", allowApp: true };
  }
  // Google script timeouts must not ContentBlocker + then vanish in beforeSend.
  if (isRecaptchaTimeoutMessage(outcome.message)) {
    return { soft: true, reason: "error", allowApp: true };
  }
  if (isAppCheckBlockedFetchMessage(outcome.message)) {
    return { soft: false, reason: "blocked", allowApp: false };
  }
  return { soft: true, reason: "error", allowApp: true };
}
