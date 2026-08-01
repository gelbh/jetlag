import { defineSecret, defineString } from "firebase-functions/params";
import { OVERPASS_L2_ENV_KEYS as K } from "./overpassL2Env.mjs";

/** Credentials only — mirrored after Stripe's secrets vs params split. */
const cfApiTokenSecret = defineSecret(K.API_TOKEN);
const cfR2AccessKeyIdSecret = defineSecret(K.R2_ACCESS_KEY_ID);
const cfR2SecretAccessKeySecret = defineSecret(K.R2_SECRET_ACCESS_KEY);

/**
 * Non-secret config — set via `functions/.env.jet-lag-map-companion` (no
 * hardcoded project defaults; avoids pointing emulators at prod L2 by accident).
 */
const cfAccountIdParam = defineString(K.ACCOUNT_ID);
const cfKvNamespaceIdParam = defineString(K.KV_NAMESPACE_ID);
const cfR2BucketParam = defineString(K.R2_BUCKET);
const cfR2EndpointParam = defineString(K.R2_ENDPOINT);

export const OVERPASS_L2_SECRETS = [
  cfApiTokenSecret,
  cfR2AccessKeyIdSecret,
  cfR2SecretAccessKeySecret,
];

export const OVERPASS_L2_PARAMS = [
  cfAccountIdParam,
  cfKvNamespaceIdParam,
  cfR2BucketParam,
  cfR2EndpointParam,
];
