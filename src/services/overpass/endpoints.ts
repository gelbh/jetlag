// Parallel implementation: functions/overpassEndpoints.mjs (Cloud Functions runtime).

export const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";

/** Ordered free public Overpass interpreters — first is preferred. */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

export type OverpassEndpoint = (typeof OVERPASS_ENDPOINTS)[number];
