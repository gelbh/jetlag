import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryCache } from "../memoryCache.mjs";

describe("memoryCache", () => {
  it("returns cached values before ttl expiry", () => {
    const cache = createMemoryCache(1_000);
    cache.set("key", "value");
    assert.equal(cache.get("key"), "value");
  });

  it("expires cached values after ttl", async () => {
    const cache = createMemoryCache(20);
    cache.set("key", "value");
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(cache.get("key"), undefined);
  });
});
