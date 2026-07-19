import { createHash } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { createMemoryCache } from "../lib/memoryCache.mjs";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";
import { enqueueOverpassFetch } from "./overpassQueue.mjs";
import {
  overpassL2CacheKey,
  readOverpassL2,
  writeOverpassL2,
} from "./overpassSharedCache.mjs";

export const OVERPASS_FETCH_TIMEOUT_MS = 25_000;
export const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;

export const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);

export function overpassCacheKey(query) {
  return createHash("sha256").update(query).digest("hex");
}

function logCache(result, tier) {
  console.log(JSON.stringify({ type: "overpass_cache", result, tier }));
}

export async function fetchOverpassWithFailover(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": OVERPASS_USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        OVERPASS_FETCH_TIMEOUT_MS,
      );

      if (response.ok) {
        return response;
      }

      if (
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        lastError = new Error("Overpass timed out.");
        continue;
      }

      throw new Error("Overpass query failed.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Overpass timed out.");
}

export async function fetchCachedOverpassQuery(query, tier = "free") {
  const l1Key = overpassCacheKey(query);
  const l2Key = overpassL2CacheKey(query, tier);
  const cached = overpassResponseCache.get(l1Key);
  if (cached) {
    logCache("l1_hit", tier);
    return cached;
  }

  const l2 = await readOverpassL2(l2Key);
  if (l2) {
    overpassResponseCache.set(l1Key, l2.text);
    logCache("l2_hit", tier);
    return l2.text;
  }

  try {
    const response = await enqueueOverpassFetch(tier, () =>
      fetchOverpassWithFailover(query),
    );
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        response.status === 504
          ? "Overpass timed out."
          : "Overpass query failed.",
      );
    }
    overpassResponseCache.set(l1Key, text);
    await writeOverpassL2(l2Key, text, "application/json");
    logCache("miss", tier);
    return text;
  } catch (error) {
    const stale = await readOverpassL2(l2Key, { allowExpired: true });
    if (stale?.text) {
      overpassResponseCache.set(l1Key, stale.text);
      logCache("stale", tier);
      return stale.text;
    }
    logCache("upstream_error", tier);
    throw error;
  }
}

export function clearOverpassCachesForTests() {
  overpassResponseCache.clear();
}
