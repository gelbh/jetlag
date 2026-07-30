const IDB_CONNECTION_CLOSING = /database connection is closing/i;
const WEBKIT_LOAD_FAILED = /^Load failed(?:\s*\([^)]*\))?$/i;
const RECAPTCHA_OT_TYPEERROR =
  /(?:reading ['"]oT['"]|evaluating ['"][^'"]*\.oT['"])/i;
const FIRESTORE_IDB_PERSISTENCE =
  /INTERNAL ASSERTION FAILED:[\s\S]*\bID:\s*b815\b|Error storing new key generator value in database/i;
const RECAPTCHA_TIMEOUT = /^reCAPTCHA Timeout\s*\(/i;
const BROWSER_EXTENSION_NOISE =
  /Invalid call to runtime\.sendMessage\(\)|Object Not Found Matching Id:/i;
const APP_CHECK_SOFT_PROBE =
  /App Check probe timed out|appCheck\/initial-throttle|initial-throttle/i;

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

/** Soft App Check probe outcomes that must not land as Sentry errors. */
export function isAppCheckSoftFailureMessage(message: string): boolean {
  return APP_CHECK_SOFT_PROBE.test(message);
}
