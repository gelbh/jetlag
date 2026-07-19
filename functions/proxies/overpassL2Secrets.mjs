import { defineSecret } from "firebase-functions/params";

export const cfAccountIdSecret = defineSecret("CF_ACCOUNT_ID");
export const cfKvNamespaceIdSecret = defineSecret("CF_KV_NAMESPACE_ID");
export const cfApiTokenSecret = defineSecret("CF_API_TOKEN");
export const cfR2AccessKeyIdSecret = defineSecret("CF_R2_ACCESS_KEY_ID");
export const cfR2SecretAccessKeySecret = defineSecret("CF_R2_SECRET_ACCESS_KEY");
export const cfR2BucketSecret = defineSecret("CF_R2_BUCKET");
export const cfR2EndpointSecret = defineSecret("CF_R2_ENDPOINT");

/** Mount on every Function that calls Overpass L2 (proxy + warm preload). */
export const OVERPASS_L2_SECRETS = [
  cfAccountIdSecret,
  cfKvNamespaceIdSecret,
  cfApiTokenSecret,
  cfR2AccessKeyIdSecret,
  cfR2SecretAccessKeySecret,
  cfR2BucketSecret,
  cfR2EndpointSecret,
];
