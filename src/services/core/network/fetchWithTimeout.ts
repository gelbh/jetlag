// Parallel implementation: functions/fetchWithTimeout.mjs (Cloud Functions runtime).
import type { ProgressNode } from "@/domain/progress/progressTree";
import { anySignal, throwIfAborted } from "./anySignal";

/** Upper bound for raw geo asset / public geo API requests so flaky networks fail fast. */
export const GEO_FETCH_TIMEOUT_MS = 15_000;

export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * True for failures that say nothing about whether the resource exists
 * (timeout, offline / DNS / connection reset), so callers must not cache a miss.
 */
export function isTransientFetchError(error: unknown): boolean {
  return error instanceof FetchTimeoutError || error instanceof TypeError;
}

/**
 * Like {@link fetchWithTimeout}, but the deadline also covers `read`, so a
 * body that stalls mid-download is aborted too (headers-only timeouts let
 * large geo bundles hang forever on flaky networks).
 */
export async function fetchAndReadWithTimeout<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const outerSignal = init?.signal ?? undefined;
  throwIfAborted(outerSignal);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: anySignal([controller.signal, outerSignal]),
    });
    return await read(response);
  } catch (error) {
    // A caller abort is a cancel, not a timeout: Overpass treats timeouts as
    // "query too expensive" and would split the bbox into more requests.
    throwIfAborted(outerSignal);
    if (controller.signal.aborted) {
      throw new FetchTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  return fetchAndReadWithTimeout(input, init, timeoutMs, async (response) => response);
}

/**
 * Body size in bytes as the stream will yield them, or null when unknown.
 * Under a content encoding, Content-Length is the compressed size while the
 * stream yields decoded bytes, so it cannot be used as the total.
 */
function decodedContentLength(response: Response): number | null {
  const encoding = response.headers.get("Content-Encoding")?.trim().toLowerCase();
  if (encoding && encoding !== "identity") {
    return null;
  }
  const length = Number(response.headers.get("Content-Length"));
  return Number.isFinite(length) && length > 0 ? length : null;
}

/**
 * Reads the body as text, counting bytes on `node` when the total is known.
 * Without a usable Content-Length the stage stays timed. Call it inside the
 * `read` callback of {@link fetchAndReadWithTimeout} so the deadline covers it.
 */
export async function readTextWithProgress(
  response: Response,
  node: ProgressNode | undefined,
): Promise<string> {
  if (!node || !response.body) {
    return response.text();
  }

  node.start();
  let total = decodedContentLength(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    loaded += value.byteLength;
    parts.push(decoder.decode(value, { stream: true }));
    if (total !== null && loaded > total) {
      // A proxy changed the body after all; stop trusting the header.
      total = null;
    }
    if (total !== null) {
      node.setCount(loaded, total);
    }
  }
  parts.push(decoder.decode());
  return parts.join("");
}
