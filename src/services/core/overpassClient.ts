import { FetchTimeoutError, fetchWithTimeout } from "./fetchWithTimeout";
import { buildPremiumProxyHeaders } from "./accessControl";
import { getFirebaseAuth } from "./firebase";
import { waitForRestoredFirebaseAuth } from "./firebaseAuthReady";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "../overpass/endpoints";
import { withOverpassConcurrencyLimit } from "../overpass/requestQueue";

const OVERPASS_MAX_RETRIES = 3;
const OVERPASS_BASE_BACKOFF_MS = 750;
const OVERPASS_FETCH_TIMEOUT_MS = 15_000;

const OVERPASS_UNAVAILABLE_MESSAGE =
  "Map data didn't load. Check your connection and try again.";

export class OverpassUnavailableError extends Error {
  constructor(message = OVERPASS_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "OverpassUnavailableError";
  }
}

export function overpassErrorMessage(
  error: unknown,
  fallback = "Map data didn't load.",
): string {
  if (error instanceof OverpassUnavailableError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

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

function isRetryableOverpassStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableOverpassError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error && error.message.includes("Failed to fetch")) {
    return true;
  }

  return false;
}

function isNonRetryableOverpassFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "Overpass query failed." ||
      error.message === "Overpass query returned an invalid response.")
  );
}

async function postOverpassQuery(
  endpoint: string,
  query: string,
): Promise<Response> {
  return fetchWithTimeout(
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
}

async function fetchOverpassDirect(query: string): Promise<Response> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= OVERPASS_MAX_RETRIES; attempt += 1) {
      try {
        const response = await postOverpassQuery(endpoint, query);

        if (response.ok) {
          return response;
        }

        if (
          isRetryableOverpassStatus(response.status) &&
          attempt < OVERPASS_MAX_RETRIES
        ) {
          lastError = new OverpassUnavailableError();
          await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
          continue;
        }

        if (isRetryableOverpassStatus(response.status)) {
          lastError = new OverpassUnavailableError();
          break;
        }

        throw new Error("Overpass query failed.");
      } catch (error) {
        if (isNonRetryableOverpassFailure(error)) {
          throw error;
        }

        if (error instanceof FetchTimeoutError) {
          lastError = new OverpassUnavailableError();
          if (attempt < OVERPASS_MAX_RETRIES) {
            await sleep(retryDelayMs(attempt, null));
            continue;
          }

          break;
        }

        if (!isRetryableOverpassError(error)) {
          throw error;
        }

        lastError = new OverpassUnavailableError();
        if (attempt < OVERPASS_MAX_RETRIES) {
          await sleep(retryDelayMs(attempt, null));
          continue;
        }

        break;
      }
    }
  }

  throw lastError ?? new OverpassUnavailableError();
}

function proxyHeadersIncludeAuth(headers: HeadersInit): boolean {
  if (headers instanceof Headers) {
    return headers.has("Authorization");
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "authorization");
  }

  return Object.keys(headers as Record<string, string>).some(
    (key) => key.toLowerCase() === "authorization",
  );
}

async function fetchOverpassViaProxy(
  query: string,
  proxyHeaders: HeadersInit,
): Promise<Response> {
  const proxyUrl = overpassProxyUrl();
  if (!proxyUrl) {
    return fetchOverpassDirect(query);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVERPASS_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        proxyUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...proxyHeaders,
          },
          body: JSON.stringify({ query }),
        },
        OVERPASS_FETCH_TIMEOUT_MS,
      );

      if (response.status === 401) {
        return response;
      }

      if (response.status === 403) {
        throw new OverpassUnavailableError(
          "Map data unavailable. Rejoin session or create a new Premium session.",
        );
      }

      if (response.ok) {
        return response;
      }

      if (
        isRetryableOverpassStatus(response.status) &&
        attempt < OVERPASS_MAX_RETRIES
      ) {
        lastError = new OverpassUnavailableError();
        await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
        continue;
      }

      if (isRetryableOverpassStatus(response.status)) {
        throw new OverpassUnavailableError();
      }

      throw new Error("Overpass query failed.");
    } catch (error) {
      if (
        error instanceof OverpassUnavailableError ||
        isNonRetryableOverpassFailure(error)
      ) {
        throw error;
      }

      if (!isRetryableOverpassError(error)) {
        throw error;
      }

      lastError = new OverpassUnavailableError();
      if (attempt < OVERPASS_MAX_RETRIES) {
        await sleep(retryDelayMs(attempt, null));
        continue;
      }
    }
  }

  throw lastError ?? new OverpassUnavailableError();
}

async function fetchOverpass(query: string): Promise<Response> {
  const proxyUrl = overpassProxyUrl();
  if (!proxyUrl) {
    return fetchOverpassDirect(query);
  }

  let proxyHeaders = await buildPremiumProxyHeaders();
  if (!proxyHeadersIncludeAuth(proxyHeaders)) {
    await waitForRestoredFirebaseAuth();
    proxyHeaders = await buildPremiumProxyHeaders();
  }

  if (!proxyHeadersIncludeAuth(proxyHeaders)) {
    return fetchOverpassDirect(query);
  }

  let response = await fetchOverpassViaProxy(query, proxyHeaders);
  if (response.status !== 401) {
    return response;
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new OverpassUnavailableError(
      "Map data unavailable. Sign in and try again.",
    );
  }

  const freshToken = await user.getIdToken(true);
  proxyHeaders = {
    ...(proxyHeaders as Record<string, string>),
    Authorization: `Bearer ${freshToken}`,
  };
  response = await fetchOverpassViaProxy(query, proxyHeaders);
  if (response.status === 401 || response.status === 403) {
    throw new OverpassUnavailableError(
      "Map data unavailable. Rejoin session or create a new Premium session.",
    );
  }

  return response;
}

export async function queryOverpass<T>(query: string): Promise<T> {
  return withOverpassConcurrencyLimit(async () => {
    const response = await fetchOverpass(query);
    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Overpass query returned an invalid response.");
    }
  });
}
