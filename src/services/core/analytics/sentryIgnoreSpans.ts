/**
 * Stream-mode span drops for Overpass proxy (replaces dead transaction-type filter).
 * String matchers are partial against span name; Overpass fetch names include this path.
 */
export const CLIENT_SENTRY_IGNORE_SPANS = ["proxy/overpass"] as const;
