import { defineSecret } from "firebase-functions/params";

/** Optional paid Geofabrik Overpass peer — empty/unset skips the peer. */
export const geofabrikOverpassApiKeySecret = defineSecret(
  "GEOFABRIK_OVERPASS_API_KEY",
);

export const OVERPASS_PAID_SECRETS = [geofabrikOverpassApiKeySecret];
