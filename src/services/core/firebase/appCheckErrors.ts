const RECAPTCHA_ALREADY_RENDERED = /reCAPTCHA has already been rendered/i;

export function isRecaptchaAlreadyRenderedError(error: unknown): boolean {
  return error instanceof Error && RECAPTCHA_ALREADY_RENDERED.test(error.message);
}
