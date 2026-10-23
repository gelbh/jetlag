export const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

export type OverpassEndpoint = (typeof OVERPASS_ENDPOINTS)[number];
