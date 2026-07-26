/**
 * Race `promise` against a deadline. Does not cancel the underlying promise
 * when the timeout wins — callers should treat late resolutions as ignored.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
