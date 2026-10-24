export const NEEDS_CONNECTION_MESSAGE = "Needs a connection — try again when you have signal.";

export class NeedsConnectionError extends Error {
  constructor() {
    super(NEEDS_CONNECTION_MESSAGE);
    this.name = "NeedsConnectionError";
  }
}

export function isNeedsConnectionError(error: unknown): error is NeedsConnectionError {
  return error instanceof Error && error.name === "NeedsConnectionError";
}
