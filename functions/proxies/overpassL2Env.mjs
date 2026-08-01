/**
 * Single source for Overpass L2 Cloudflare env key names.
 * `overpassSharedCache` reads `process.env[key]`; params/secrets must use the same strings.
 */
export const OVERPASS_L2_ENV_KEYS = Object.freeze({
  ACCOUNT_ID: "CF_ACCOUNT_ID",
  KV_NAMESPACE_ID: "CF_KV_NAMESPACE_ID",
  API_TOKEN: "CF_API_TOKEN",
  R2_ACCESS_KEY_ID: "CF_R2_ACCESS_KEY_ID",
  R2_SECRET_ACCESS_KEY: "CF_R2_SECRET_ACCESS_KEY",
  R2_BUCKET: "CF_R2_BUCKET",
  R2_ENDPOINT: "CF_R2_ENDPOINT",
});

/** Ordered list for `envConfigured()` completeness checks. */
export const OVERPASS_L2_ENV_KEY_LIST = Object.freeze(
  Object.values(OVERPASS_L2_ENV_KEYS),
);
