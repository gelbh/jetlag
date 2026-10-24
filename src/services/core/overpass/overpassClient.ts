import type { ProgressNode } from "@/domain/progress/progressTree";
import { stagePriorMs } from "@/domain/progress/stagePriors";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "../../geo/overpass/endpoints";
import { type SlotRequest, withOverpassConcurrencyLimit } from "../../geo/overpass/requestQueue";
import { buildPremiumProxyHeaders } from "../auth/accessControl";
import { getFirebaseAuth } from "../firebase/firebase";
import { waitForRestoredFirebaseAuth } from "../firebase/firebaseAuthReady";
import { abortableSleep, throwIfAborted } from "../network/anySignal";
import { FetchTimeoutError, fetchWithTimeout } from "../network/fetchWithTimeout";
import { isOverpassHostCooled, recordOverpassHostCooldown } from "./overpassHostCooldown";

const OVERPASS_MAX_RETRIES = 3;
export const OVERPASS_PROXY_MAX_RETRIES = 1;
const OVERPASS_BASE_BACKOFF_MS = 750;
const OVERPASS_DIRECT_FETCH_TIMEOUT_MS = 15_000;
/**
 * Browser proxy attempt timeout. Must outlast server Overpass failover (50s)
 * plus Postpass fallback (25s) so the client receives structured JSON 504
 * instead of aborting mid-flight. Keep under `PROXY_TIMEOUT_SECONDS_CEILING`
 * (90s).
 */
export const OVERPASS_PROXY_FETCH_TIMEOUT_MS = 80_000;

const OVERPASS_UNAVAILABLE_MESSAGE = "Map data didn't load. Check your connection and try again.";

export class OverpassUnavailableError extends Error {
  constructor(message = OVERPASS_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "OverpassUnavailableError";
  }
}

export class OverpassQueryTooExpensiveError extends Error {
  constructor(message = OVERPASS_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "OverpassQueryTooExpensiveError";
  }
}

export class OverpassPayloadTooLargeError extends Error {
  constructor(message = "Overpass response too large.") {
    super(message);
    this.name = "OverpassPayloadTooLargeError";
  }
}

export function overpassErrorMessage(error: unknown, fallback = "Map data didn't load."): string {
  if (error instanceof OverpassUnavailableError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export interface OverpassQueryOptions {
  /** Cancels the request, its retries and backoff, and releases its pool slot. */
  signal?: AbortSignal;
  /** Pool lane; a getter is read live so a shared fetch can be promoted. */
  priority?: SlotRequest["priority"];
  /** Stage to drive: queued while waiting for a slot, finished on success. */
  node?: ProgressNode;
}

interface AttemptContext {
  signal?: AbortSignal;
  onRetry?: (attempt: number) => void;
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
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

function overpassEndpointHostname(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

function isRetryableUpstreamOverpassStatus(status: number): boolean {
  return status === 502 || status === 503;
}

function isRetryableProxyStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503;
}

function isRetryableOverpassError(error: unknown): boolean {
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

function throwIfOverpassQueryTooExpensive(source: { status: number } | { error: unknown }): void {
  if ("status" in source) {
    if (source.status === 504) {
      throw new OverpassQueryTooExpensiveError();
    }
    return;
  }

  if (source.error instanceof OverpassQueryTooExpensiveError) {
    throw source.error;
  }

  if (source.error instanceof FetchTimeoutError) {
    throw new OverpassQueryTooExpensiveError();
  }
}

async function postOverpassQuery(
  endpoint: string,
  query: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    },
    OVERPASS_DIRECT_FETCH_TIMEOUT_MS,
  );
}

async function fetchOverpassDirect(query: string, context: AttemptContext = {}): Promise<Response> {
  const { signal } = context;
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const host = overpassEndpointHostname(endpoint);
    if (isOverpassHostCooled(host)) {
      lastError = new OverpassUnavailableError();
      continue;
    }

    for (let attempt = 0; attempt <= OVERPASS_MAX_RETRIES; attempt += 1) {
      try {
        if (attempt > 0) {
          context.onRetry?.(attempt);
        }
        const response = await postOverpassQuery(endpoint, query, signal);

        if (response.ok) {
          return response;
        }

        throwIfOverpassQueryTooExpensive({ status: response.status });

        if (response.status === 429 || response.status === 406) {
          recordOverpassHostCooldown(host);
          lastError = new OverpassUnavailableError();
          break;
        }

        if (isRetryableUpstreamOverpassStatus(response.status) && attempt < OVERPASS_MAX_RETRIES) {
          lastError = new OverpassUnavailableError();
          await abortableSleep(retryDelayMs(attempt, response.headers.get("Retry-After")), signal);
          continue;
        }

        if (isRetryableUpstreamOverpassStatus(response.status)) {
          lastError = new OverpassUnavailableError();
          break;
        }

        if (response.status === 413) {
          throw new OverpassPayloadTooLargeError();
        }

        throw new Error("Overpass query failed.");
      } catch (error) {
        // A cancel must not retry, fail over, or read as "too expensive" (which splits).
        throwIfAborted(signal);
        if (isNonRetryableOverpassFailure(error)) {
          throw error;
        }

        throwIfOverpassQueryTooExpensive({ error });

        if (!isRetryableOverpassError(error)) {
          throw error;
        }

        lastError = new OverpassUnavailableError();
        if (attempt < OVERPASS_MAX_RETRIES) {
          await abortableSleep(retryDelayMs(attempt, null), signal);
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
  context: AttemptContext = {},
): Promise<Response> {
  const { signal } = context;
  const proxyUrl = overpassProxyUrl();
  if (!proxyUrl) {
    return fetchOverpassDirect(query, context);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVERPASS_PROXY_MAX_RETRIES; attempt += 1) {
    try {
      if (attempt > 0) {
        context.onRetry?.(attempt);
      }
      const response = await fetchWithTimeout(
        proxyUrl,
        {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            ...proxyHeaders,
          },
          body: JSON.stringify({ query }),
        },
        OVERPASS_PROXY_FETCH_TIMEOUT_MS,
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

      throwIfOverpassQueryTooExpensive({ status: response.status });

      if (isRetryableProxyStatus(response.status) && attempt < OVERPASS_PROXY_MAX_RETRIES) {
        lastError = new OverpassUnavailableError();
        await abortableSleep(retryDelayMs(attempt, response.headers.get("Retry-After")), signal);
        continue;
      }

      if (isRetryableProxyStatus(response.status)) {
        throw new OverpassUnavailableError();
      }

      if (response.status === 413) {
        throw new OverpassPayloadTooLargeError();
      }

      throw new Error("Overpass query failed.");
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof OverpassUnavailableError || isNonRetryableOverpassFailure(error)) {
        throw error;
      }

      throwIfOverpassQueryTooExpensive({ error });

      if (!isRetryableOverpassError(error)) {
        throw error;
      }

      lastError = new OverpassUnavailableError();
      if (attempt < OVERPASS_PROXY_MAX_RETRIES) {
        await abortableSleep(retryDelayMs(attempt, null), signal);
        continue;
      }
    }
  }

  throw lastError ?? new OverpassUnavailableError();
}

async function fetchOverpass(query: string, context: AttemptContext = {}): Promise<Response> {
  const proxyUrl = overpassProxyUrl();
  if (!proxyUrl) {
    return fetchOverpassDirect(query, context);
  }

  let proxyHeaders = await buildPremiumProxyHeaders();
  if (!proxyHeadersIncludeAuth(proxyHeaders)) {
    await waitForRestoredFirebaseAuth();
    proxyHeaders = await buildPremiumProxyHeaders();
  }

  if (!proxyHeadersIncludeAuth(proxyHeaders)) {
    return fetchOverpassDirect(query, context);
  }

  let response = await fetchOverpassViaProxy(query, proxyHeaders, context);
  if (response.status !== 401) {
    return response;
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new OverpassUnavailableError("Map data unavailable. Sign in and try again.");
  }

  await user.getIdToken(true);
  throwIfAborted(context.signal);
  proxyHeaders = await buildPremiumProxyHeaders();
  response = await fetchOverpassViaProxy(query, proxyHeaders, context);
  if (response.status === 401 || response.status === 403) {
    throw new OverpassUnavailableError(
      "Map data unavailable. Rejoin session or create a new Premium session.",
    );
  }

  return response;
}

const QUEUE_LABEL = "Waiting for map server";

function queueLabel(position: number): string {
  return position === 0 ? `${QUEUE_LABEL} (next)` : `${QUEUE_LABEL} (${position + 1} ahead)`;
}

export async function queryOverpass<T>(
  query: string,
  options: OverpassQueryOptions = {},
): Promise<T> {
  const { signal, node } = options;
  const result = await withOverpassConcurrencyLimit(
    async () => {
      node?.start();
      const response = await fetchOverpass(query, {
        signal,
        onRetry: (attempt) => node?.setLabel(`Retrying map server (attempt ${attempt + 1})`),
      });
      const text = await response.text();
      throwIfAborted(signal);

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error("Overpass query returned an invalid response.");
      }
    },
    {
      priority: options.priority,
      signal,
      onQueuePosition: node
        ? (position) =>
            node.queue(queueLabel(position), (position + 1) * stagePriorMs("queue:overpass"))
        : undefined,
    },
  );
  node?.setLabel(null);
  node?.finish();
  return result;
}
