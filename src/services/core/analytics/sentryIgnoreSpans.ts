/**
 * Stream-mode span drops for Overpass proxy (replaces dead transaction-type filter).
 * String matchers are partial against span name; Overpass fetch names include this path.
 * Mutable array: Sentry's ignoreSpans option rejects readonly tuples.
 */
export const CLIENT_SENTRY_IGNORE_SPANS: Array<string | RegExp> = ["proxy/overpass"];
