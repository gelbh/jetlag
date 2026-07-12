import { createHash } from "node:crypto";
import { fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { createMemoryCache } from "../lib/memoryCache.mjs";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";
import { enqueueOverpassFetch } from "./overpassQueue.mjs";

export const OVERPASS_FETCH_TIMEOUT_MS = 25_000;
export const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;

export const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);

export function overpassCacheKey(query) {
  return createHash("sha256").update(query).digest("hex");
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
  const cacheKey = overpassCacheKey(query);
  const cached = overpassResponseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await enqueueOverpassFetch(tier, () =>
    fetchOverpassWithFailover(query),
  );
  const text = await response.text();

  if (!response.ok) {
    if (response.status === 504) {
      throw new Error("Overpass timed out.");
    }

    throw new Error("Overpass query failed.");
  }

  overpassResponseCache.set(cacheKey, text);
  return text;
}

export function clearOverpassCachesForTests() {
  overpassResponseCache.clear();
}
