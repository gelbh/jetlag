/**
 * Client errors from code we do not ship (wallet injection, browser extensions,
 * benign browser warnings) or that the app recovers from on its own (stale
 * chunks after a deploy). Kept as a literal list; PostHog suppression rules
 * cover the alert path, this list covers player-report triage.
 */
export const KNOWN_NOISE_PATTERNS = Object.freeze([
  "window.ethereum",
  "ResizeObserver loop",
  "chrome-extension://",
  "moz-extension://",
  "safari-web-extension://",
  "Importing a module script failed",
]);

/**
 * @param {{ name?: unknown, message?: unknown } | null | undefined} error
 * @returns {boolean}
 */
export function isKnownNoiseError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (!message) {
    return false;
  }
  return KNOWN_NOISE_PATTERNS.some((pattern) => message.includes(pattern));
}
