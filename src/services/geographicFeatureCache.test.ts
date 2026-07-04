import { afterEach, describe, expect, it } from "vitest";
import type { GameArea } from "../domain/annotations";
import {
  adminDivisionCacheKey,
  clearGeographicFeatureCacheForTests,
  coastlineSegmentsCacheKey,
  geographicCacheKey,
  getOrFetchCached,
  landmassCacheKey,
  staticTransitCacheKey,
} from "./geographicFeatureCache";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

describe("geographicFeatureCache TTL tiers", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  it("uses stable cache key prefixes for long-lived layers", () => {
    expect(adminDivisionCacheKey(sampleGameArea, 6)).toMatch(/^admin:6:/);
    expect(landmassCacheKey(sampleGameArea)).toMatch(/^landmass:/);
    expect(coastlineSegmentsCacheKey(sampleGameArea)).toMatch(/^coastline:/);
    expect(staticTransitCacheKey(sampleGameArea)).toMatch(/^transit:static:/);
    expect(geographicCacheKey(sampleGameArea, "measuring:park")).toMatch(
      /^measuring:park:/,
    );
  });
});

async function writeExpiredPersistedEntry(
  key: string,
  value: unknown,
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("jetlag-geographic-cache", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
  });

  const transaction = database.transaction("entries", "readwrite");
  transaction.objectStore("entries").put({
    key,
    value,
    expiresAt: Date.now() - 60_000,
  });

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IDB write failed"));
  });
}

describe("geographicFeatureCache stale fallback", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  it("returns expired stable cache entries when the fetcher rejects", async () => {
    const key = adminDivisionCacheKey(sampleGameArea, 6);
    const staleValue = [{ id: "stale-admin" }];

    await writeExpiredPersistedEntry(key, staleValue);

    await expect(
      getOrFetchCached(key, async () => {
        throw new Error("network down");
      }),
    ).resolves.toEqual(staleValue);
  });

  it("rethrows when the fetcher rejects and no stale stable cache exists", async () => {
    const key = adminDivisionCacheKey(sampleGameArea, 6);

    await expect(
      getOrFetchCached(key, async () => {
        throw new Error("network down");
      }),
    ).rejects.toThrow("network down");
  });
});
