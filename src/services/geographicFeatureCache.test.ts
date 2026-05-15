import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../domain/annotations";
import {
  clearGeographicFeatureCacheForTests,
  coastlineSegmentsCacheKey,
  getOrFetchCached,
} from "./geographicFeatureCache";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
};

describe("geographicFeatureCache", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
    vi.restoreAllMocks();
  });

  it("reuses cached values for the same play area key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ segments: [] });

    await getOrFetchCached(coastlineSegmentsCacheKey(sampleGameArea), fetcher);
    await getOrFetchCached(coastlineSegmentsCacheKey(sampleGameArea), fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes in-flight requests for the same key", async () => {
    const originalIndexedDb = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });

    let resolvePending: ((value: string) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvePending = resolve;
        }),
    );

    const first = getOrFetchCached("pending-key", fetcher);
    const second = getOrFetchCached("pending-key", fetcher);

    await Promise.resolve();
    resolvePending?.("ready");
    await expect(first).resolves.toBe("ready");
    await expect(second).resolves.toBe("ready");
    expect(fetcher).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: originalIndexedDb,
    });
  });
});
