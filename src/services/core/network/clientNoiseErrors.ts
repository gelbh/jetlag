const IDB_CONNECTION_CLOSING = /database connection is closing/i;
const WEBKIT_LOAD_FAILED = /^Load failed(?:\s*\([^)]*\))?$/i;
const RECAPTCHA_OT_TYPEERROR =
  /(?:reading ['"]oT['"]|evaluating ['"][^'"]*\.oT['"])/i;

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
