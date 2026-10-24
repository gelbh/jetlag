import { defineSecret } from "firebase-functions/params";

export const geofabrikOverpassApiKeySecret = defineSecret("GEOFABRIK_OVERPASS_API_KEY");

export const OVERPASS_PAID_SECRETS = [geofabrikOverpassApiKeySecret];
