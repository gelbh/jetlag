// Parallel implementation: src/services/core/network/fetchWithTimeout.ts (Vite client).
export class FetchTimeoutError extends Error {
  /**
   * @param {number} timeoutMs
   */
  constructor(timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms.`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isAbortError(error) {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

export async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    // Convert AbortError at the timeout boundary so callers / Sentry never see
    // raw abort noise (JETLAG-T). Overpass failover still maps remaining aborts.
    if (isAbortError(error)) {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeoutAndRetry(
  url,
  init,
  timeoutMs,
  retries = 1,
) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);
      if (response.ok || attempt === retries) {
        return response;
      }

      if (response.status === 502 || response.status === 504) {
        lastError = new Error(`Upstream request failed with ${response.status}.`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Upstream request failed.");
}
