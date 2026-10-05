import { OPEN_FREEMAP_TILE_IGNORE_SPAN } from "./sentryHostNoiseSpans";

/**
 * Stream-mode span drops (partial match against span name / description).
 * Mutable array: Sentry's ignoreSpans option rejects readonly tuples.
 */
export const CLIENT_SENTRY_IGNORE_SPANS: Array<string | RegExp> = [
  "proxy/overpass",
  OPEN_FREEMAP_TILE_IGNORE_SPAN,
];
