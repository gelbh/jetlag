const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_BACKOFF_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableAsyncError(error: unknown): boolean {
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

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseBackoffMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const shouldRetry = options.shouldRetry ?? isRetryableAsyncError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      await sleep(baseBackoffMs * 2 ** attempt);
    }
  }

  throw lastError;
}
