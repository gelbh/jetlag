/**
 * Stream-lifecycle Sentry cannot status-filter spans at send time.
 * Ignore KV values URLs at span start (404 misses dominate; 200 hits are also
 * non-actionable for host triage). Credential 401s on this path are rare and
 * still show in Functions logs / non-span signals.
 */

/** Partial match against span description (fetch name includes full URL). */
export const CLOUDFLARE_KV_VALUES_IGNORE_SPAN =
  /api\.cloudflare\.com\/.*\/storage\/kv\/.*\/values\//;

/**
 * @param {string} description
 * @returns {boolean}
 */
export function isCloudflareKvValuesNoiseSpanName(description) {
  return CLOUDFLARE_KV_VALUES_IGNORE_SPAN.test(description);
}
