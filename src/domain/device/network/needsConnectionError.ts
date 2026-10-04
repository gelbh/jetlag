export const NEEDS_CONNECTION_MESSAGE = "Needs a connection — try again when you have signal.";

/**
 * Thrown before a server-only action (callable) runs while the device is
 * effectively offline. Callables have no offline queue, so failing fast beats
 * waiting out the SDK's 70 s default timeout.
 */
export class NeedsConnectionError extends Error {
  constructor() {
    super(NEEDS_CONNECTION_MESSAGE);
    this.name = "NeedsConnectionError";
  }
}

export function isNeedsConnectionError(error: unknown): error is NeedsConnectionError {
  return error instanceof Error && error.name === "NeedsConnectionError";
}
