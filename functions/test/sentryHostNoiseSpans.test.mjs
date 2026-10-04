import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOUDFLARE_KV_VALUES_IGNORE_SPAN,
  isCloudflareKvValuesNoiseSpanName,
} from "../lib/sentryHostNoiseSpans.mjs";

test("matches KV values URLs", () => {
  assert.equal(
    isCloudflareKvValuesNoiseSpanName(
      "GET https://api.cloudflare.com/client/v4/accounts/x/storage/kv/namespaces/y/values/premium%3Aabc",
    ),
    true,
  );
  assert.ok(CLOUDFLARE_KV_VALUES_IGNORE_SPAN instanceof RegExp);
});

test("ignores non-KV Cloudflare URLs", () => {
  assert.equal(
    isCloudflareKvValuesNoiseSpanName(
      "GET https://api.cloudflare.com/client/v4/accounts/x/tokens/verify",
    ),
    false,
  );
});
