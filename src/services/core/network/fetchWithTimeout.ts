import { anySignal, throwIfAborted } from "./anySignal";

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
