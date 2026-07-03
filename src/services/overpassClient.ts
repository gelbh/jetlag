import { fetchWithTimeout } from "./fetchWithTimeout";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";
const OVERPASS_MAX_RETRIES = 3;
const OVERPASS_BASE_BACKOFF_MS = 750;
const OVERPASS_FETCH_TIMEOUT_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryDelayMs(
  attempt: number,
  retryAfterHeader: string | null,
): number {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      return retryAfterSeconds * 1000;
    }
  }

  return OVERPASS_BASE_BACKOFF_MS * 2 ** attempt;
}

function overpassProxyUrl(): string | null {
  const proxyUrl = import.meta.env.VITE_OVERPASS_PROXY_URL?.trim();
  return proxyUrl && proxyUrl.length > 0 ? proxyUrl : null;
}

async function fetchOverpassDirect(query: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVERPASS_MAX_RETRIES; attempt += 1) {
    const response = await fetchWithTimeout(
      OVERPASS_ENDPOINT,
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

    if (response.status === 504 && attempt < OVERPASS_MAX_RETRIES) {
      lastError = new Error("Overpass timed out. Try again in a moment.");
      await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
      continue;
    }

    if (response.status === 504) {
      throw new Error("Overpass timed out. Try again in a moment.");
    }

    throw new Error("Overpass query failed.");
  }

  throw lastError ?? new Error("Overpass timed out. Try again in a moment.");
}

async function fetchOverpassViaProxy(query: string): Promise<Response> {
  const proxyUrl = overpassProxyUrl();
  if (!proxyUrl) {
    return fetchOverpassDirect(query);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVERPASS_MAX_RETRIES; attempt += 1) {
    const response = await fetchWithTimeout(
      proxyUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
      OVERPASS_FETCH_TIMEOUT_MS,
    );

    if (response.ok) {
      return response;
    }

    if (response.status === 504 && attempt < OVERPASS_MAX_RETRIES) {
      lastError = new Error("Overpass timed out. Try again in a moment.");
      await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
      continue;
    }

    if (response.status === 504) {
      throw new Error("Overpass timed out. Try again in a moment.");
    }

    throw new Error("Overpass query failed.");
  }

  throw lastError ?? new Error("Overpass timed out. Try again in a moment.");
}

async function fetchOverpass(query: string): Promise<Response> {
  if (overpassProxyUrl()) {
    return fetchOverpassViaProxy(query);
  }

  return fetchOverpassDirect(query);
}

export async function queryOverpass<T>(query: string): Promise<T> {
  const response = await fetchOverpass(query);
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Overpass query returned an invalid response.");
  }
}
