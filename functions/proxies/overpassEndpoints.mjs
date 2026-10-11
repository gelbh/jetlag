// Public peer list mirrored in src/services/geo/overpass/endpoints.ts (Vite).
// Paid Geofabrik peer + status/Postpass failover are Functions-only.
// Regional peers (gated ship set) prepend when options.query bbox is fully inside coverage.

import {
  parseOverpassQueryBbox,
  regionalOverpassEndpointsForBbox,
} from "./overpassRegionPeers.mjs";

export const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Public peers plus optional paid Geofabrik Overpass when
 * `GEOFABRIK_OVERPASS_API_KEY` is set (Functions only, never Vite).
 * Order: matching regional peers (if any), then Geofabrik, then public.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @param {{ query?: string }} [options]
 * @returns {string[]}
 */
export function buildOverpassEndpointList(env = process.env, options = {}) {
  const key = String(env.GEOFABRIK_OVERPASS_API_KEY ?? "").trim();
  const paid = key
    ? [`https://overpass.geofabrik.de/${encodeURIComponent(key)}/api/interpreter`]
    : [];
  const bbox = typeof options.query === "string" ? parseOverpassQueryBbox(options.query) : null;
  return [...regionalOverpassEndpointsForBbox(bbox), ...paid, ...OVERPASS_ENDPOINTS];
}

/**
 * Host-only label for logs (never include paid API key path segment).
 *
 * @param {string} endpoint
 * @returns {string}
 */
export function overpassEndpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}
