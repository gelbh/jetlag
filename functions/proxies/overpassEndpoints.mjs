// Parallel implementation: src/services/geo/overpass/endpoints.ts (Vite client).

export const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Public peers plus optional paid Geofabrik Overpass when
 * `GEOFABRIK_OVERPASS_API_KEY` is set (Functions only — never Vite).
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function buildOverpassEndpointList(env = process.env) {
  const key = String(env.GEOFABRIK_OVERPASS_API_KEY ?? "").trim();
  if (!key) {
    return [...OVERPASS_ENDPOINTS];
  }
  return [
    `https://overpass.geofabrik.de/${encodeURIComponent(key)}/api/interpreter`,
    ...OVERPASS_ENDPOINTS,
  ];
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
