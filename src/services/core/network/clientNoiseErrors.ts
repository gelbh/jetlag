const IDB_CONNECTION_CLOSING = /database connection is closing/i;
const WEBKIT_LOAD_FAILED = /^Load failed(?:\s*\([^)]*\))?$/i;
const RECAPTCHA_OT_TYPEERROR =
  /(?:reading ['"]oT['"]|evaluating ['"][^'"]*\.oT['"])/i;
const FIRESTORE_IDB_PERSISTENCE =
  /INTERNAL ASSERTION FAILED:[\s\S]*\bID:\s*b815\b|Error storing new key generator value in database/i;
const RECAPTCHA_TIMEOUT = /^reCAPTCHA Timeout\s*\(/i;
const BROWSER_EXTENSION_NOISE =
  /Invalid call to runtime\.sendMessage\(\)|Object Not Found Matching Id:/i;
const APP_CHECK_INITIAL_THROTTLE = /appCheck\/initial-throttle/i;
const APP_CHECK_PROBE_TIMED_OUT = /App Check probe timed out/i;
const APP_CHECK_BLOCKED_FETCH = /blocked|failed to fetch|load failed/i;

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

/** Google reCAPTCHA script timeout string. */
export function isRecaptchaTimeoutMessage(message: string): boolean {
  return RECAPTCHA_TIMEOUT.test(message.trim());
}

/** Browser extension / injector noise leaking into the page. */
export function isBrowserExtensionNoiseMessage(message: string): boolean {
  return BROWSER_EXTENSION_NOISE.test(message);
}

/** Firebase App Check initial-throttle error code in the message. */
export function isAppCheckInitialThrottleMessage(message: string): boolean {
  return APP_CHECK_INITIAL_THROTTLE.test(message);
}

/**
 * Soft App Check probe outcomes that must not land as Sentry errors
 * (beforeSend safety net for uncaught leftovers).
 */
export function isAppCheckSoftFailureMessage(message: string): boolean {
  return (
    APP_CHECK_PROBE_TIMED_OUT.test(message) ||
    isAppCheckInitialThrottleMessage(message) ||
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
  // Google script timeouts must not ContentBlocker + then vanish in beforeSend.
  if (isRecaptchaTimeoutMessage(outcome.message)) {
    return { soft: true, reason: "error", allowApp: true };
  }
  if (isAppCheckBlockedFetchMessage(outcome.message)) {
    return { soft: false, reason: "blocked", allowApp: false };
  }
  return { soft: true, reason: "error", allowApp: true };
}
