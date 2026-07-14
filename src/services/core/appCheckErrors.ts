export function isRecaptchaAlreadyRenderedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /reCAPTCHA has already been rendered/i.test(error.message)
  );
}
