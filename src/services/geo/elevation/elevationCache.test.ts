import { beforeEach, describe, expect, it } from "vitest";
import { clearPersistedCacheForTests } from "../cache/indexedDb";
import { memoryCache } from "../cache/memory";
import { hydrateElevationCacheFromIdb } from "./index";
import {
  clearElevationCacheForTests,
  elevationCacheKey,
  readCachedElevation,
  writeCachedElevationDurable,
} from "./rateLimit";

describe("elevation durable cache", () => {
  beforeEach(async () => {
    clearElevationCacheForTests();
    memoryCache.clear();
    await clearPersistedCacheForTests();
  });

  it("survives memory clear via IDB hydrate", async () => {
    const key = elevationCacheKey([40.7128, -74.006]);
    await writeCachedElevationDurable(key, 12.5);
    memoryCache.clear();
    await hydrateElevationCacheFromIdb([key]);
    expect(readCachedElevation(key)).toBe(12.5);
  });
});
