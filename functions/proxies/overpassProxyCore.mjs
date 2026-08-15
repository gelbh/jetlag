import { createHash } from "node:crypto";
import { FetchTimeoutError, fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { createMemoryCache } from "../lib/memoryCache.mjs";
import {
  buildOverpassEndpointList,
  OVERPASS_USER_AGENT,
  overpassEndpointHost,
} from "./overpassEndpoints.mjs";
import { orderOverpassEndpointsByStatus } from "./overpassStatus.mjs";
import { enqueueOverpassFetch } from "./overpassQueue.mjs";
import {
  overpassL2CacheKey,
  readOverpassL2,
  writeOverpassL2,
} from "./overpassSharedCache.mjs";
import { tryPostpassForOverpassQuery } from "./postpassFailover.mjs";

export const OVERPASS_FETCH_TIMEOUT_MS = 25_000;
/**
 * Wall-clock budget for Overpass peer failover (not including Postpass/L2).
 * Kept under the `proxy` Cloud Run timeout so we can return JSON 504 instead
 * of a naked platform kill. Do not raise without revisiting
 * {@link PROXY_TIMEOUT_SECONDS_CEILING}.
 */
export const OVERPASS_FAILOVER_BUDGET_MS = 50_000;
/**
 * Documented ceiling for `proxy` `timeoutSeconds` (Jevons). Prefer cache /
 * Postpass failover over raising further; 90s leaves headroom after the
 * Overpass budget for Postpass + stale L2 + response write.
 */
export const PROXY_TIMEOUT_SECONDS_CEILING = 90;
export const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;
/** Minimum remaining ms before attempting another Overpass peer. */
const OVERPASS_MIN_ATTEMPT_MS = 1_500;

export const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);

export function overpassCacheKey(query) {
  return createHash("sha256").update(query).digest("hex");
}

function logCache(result, tier, extra = {}) {
  console.log(JSON.stringify({ type: "overpass_cache", result, tier, ...extra }));
}

function isAbortOrTimeoutError(error) {
  return (
    error instanceof FetchTimeoutError ||
    (error instanceof Error && error.name === "AbortError") ||
    (error instanceof Error && error.name === "FetchTimeoutError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

export function toOverpassUpstreamError(error) {
  if (isAbortOrTimeoutError(error)) {
    return new Error("Overpass timed out.");
  }
  return error instanceof Error ? error : new Error(String(error));
}

export function isTimeoutLikeOverpassStatus(status) {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function logFailover(fields) {
  console.log(JSON.stringify({ type: "overpass_failover", ...fields }));
}

function logTimeout(fields) {
  console.log(JSON.stringify({ type: "overpass_timeout", ...fields }));
}

function cancelResponseBody(response) {
  try {
    const canceled = response.body?.cancel();
    if (canceled != null && typeof canceled.then === "function") {
      canceled.catch(() => {});
    }
  } catch {
    // Best-effort: avoid holding unused upstream bodies across failover.
  }
}

/**
 * @param {string} query
 * @param {{ deadlineMs?: number, now?: () => number }} [options]
 */
export async function fetchOverpassWithFailover(query, options = {}) {
  let lastError = null;
  const now = options.now ?? Date.now;
  const deadlineMs =
    typeof options.deadlineMs === "number"
      ? options.deadlineMs
      : now() + OVERPASS_FAILOVER_BUDGET_MS;
  const endpoints = await orderOverpassEndpointsByStatus(
    buildOverpassEndpointList(process.env),
  );
  let attempts = 0;

  for (const endpoint of endpoints) {
    const remainingMs = deadlineMs - now();
    if (remainingMs < OVERPASS_MIN_ATTEMPT_MS) {
      logTimeout({
        reason: "budget_exhausted",
        attempts,
        remainingMs: Math.max(0, remainingMs),
        budgetMs: OVERPASS_FAILOVER_BUDGET_MS,
      });
      throw lastError ?? new Error("Overpass timed out.");
    }

    const host = overpassEndpointHost(endpoint);
    const attemptTimeoutMs = Math.min(OVERPASS_FETCH_TIMEOUT_MS, remainingMs);
    attempts += 1;
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
        attemptTimeoutMs,
      );

      if (response.ok) {
        return response;
      }

      logFailover({ backend: "overpass", endpoint: host, status: response.status });
      cancelResponseBody(response);
      lastError = new Error(
        isTimeoutLikeOverpassStatus(response.status)
          ? "Overpass timed out."
          : "Overpass query failed.",
      );
      continue;
    } catch (error) {
      const timeoutLike = isAbortOrTimeoutError(error);
      logFailover({
        backend: "overpass",
        endpoint: host,
        error: timeoutLike ? "abort" : String(error?.name ?? error),
      });
      if (timeoutLike) {
        logTimeout({
          reason: "endpoint_timeout",
          endpoint: host,
          timeoutMs: attemptTimeoutMs,
          attempts,
        });
      }
      lastError = toOverpassUpstreamError(error);
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

  const deadlineMs = Date.now() + OVERPASS_FAILOVER_BUDGET_MS;
  try {
    const response = await enqueueOverpassFetch(tier, () =>
      fetchOverpassWithFailover(query, { deadlineMs }),
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
    logCache("miss", tier, { backend: "overpass" });
    return text;
  } catch (error) {
    try {
      const postpassText = await tryPostpassForOverpassQuery(query);
      if (postpassText != null) {
        overpassResponseCache.set(l1Key, postpassText);
        await writeOverpassL2(l2Key, postpassText, "application/json");
        logCache("miss", tier, { backend: "postpass" });
        return postpassText;
      }
    } catch {
      // Logged in tryPostpassForOverpassQuery; fall through to stale L2.
    }

    const stale = await readOverpassL2(l2Key, { allowExpired: true });
    if (stale?.text) {
      overpassResponseCache.set(l1Key, stale.text);
      logCache("stale", tier);
      return stale.text;
    }
    if (
      error instanceof Error &&
      error.message === "Overpass timed out."
    ) {
      logTimeout({ reason: "upstream_exhausted", tier });
    }
    logCache("upstream_error", tier);
    throw error;
  }
}

export function clearOverpassCachesForTests() {
  overpassResponseCache.clear();
}
