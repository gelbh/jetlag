// Public peer list mirrored in functions/proxies/overpassEndpoints.mjs.
// Client has no paid Geofabrik peer or Postpass path (proxy-only).

export const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";

/** Ordered free public Overpass interpreters; first is preferred. */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

export type OverpassEndpoint = (typeof OVERPASS_ENDPOINTS)[number];
