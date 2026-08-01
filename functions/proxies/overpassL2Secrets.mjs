import { defineSecret, defineString } from "firebase-functions/params";
import { OVERPASS_L2_ENV_KEYS as K } from "./overpassL2Env.mjs";

/** Credentials only — mirrored after Stripe's secrets vs params split. */
const cfApiTokenSecret = defineSecret(K.API_TOKEN);
const cfR2AccessKeyIdSecret = defineSecret(K.R2_ACCESS_KEY_ID);
const cfR2SecretAccessKeySecret = defineSecret(K.R2_SECRET_ACCESS_KEY);

/** Non-secret config — defaults match gelbhart prod L2 resources. */
const cfAccountIdParam = defineString(K.ACCOUNT_ID, {
  default: "578279c4ee8d8a1b0bda8ecf8ecc3f67",
});
const cfKvNamespaceIdParam = defineString(K.KV_NAMESPACE_ID, {
  default: "f12e5b59e28348e9a41371b98616cbb9",
});
const cfR2BucketParam = defineString(K.R2_BUCKET, {
  default: "jetlag-overpass-l2",
});
const cfR2EndpointParam = defineString(K.R2_ENDPOINT, {
  default:
    "https://578279c4ee8d8a1b0bda8ecf8ecc3f67.r2.cloudflarestorage.com",
});

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
