import assert from "node:assert/strict";
import test from "node:test";
import { isCloudflareKvMissSpan } from "../lib/sentryHostNoiseSpans.mjs";

test("drops KV values 404", () => {
  assert.equal(
    isCloudflareKvMissSpan({
      op: "http.client",
      data: {
        "http.url":
          "https://api.cloudflare.com/client/v4/accounts/x/storage/kv/namespaces/y/values/premium%3Aabc",
        "http.status_code": 404,
      },
    }),
    true,
  );
});

test("keeps KV 401", () => {
  assert.equal(
    isCloudflareKvMissSpan({
      op: "http.client",
      data: {
        "http.url":
          "https://api.cloudflare.com/client/v4/accounts/x/storage/kv/namespaces/y/values/premium%3Aabc",
        "http.status_code": 401,
      },
    }),
    false,
  );
});

test("keeps non-KV Cloudflare 404", () => {
  assert.equal(
    isCloudflareKvMissSpan({
      op: "http.client",
      data: {
        "http.url": "https://api.cloudflare.com/client/v4/accounts/x/tokens/verify",
        "http.status_code": 404,
      },
    }),
    false,
  );
});
