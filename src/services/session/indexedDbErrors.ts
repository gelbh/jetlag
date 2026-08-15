const IDB_DATABASE_DELETED = /Database deleted by request of the user/i;
/** Chrome closing + Firefox/WebKit closed-handle InvalidStateError. */
const IDB_DATABASE_CLOSED =
  /Can't start a transaction on a closed database|The database connection is closing/i;

function errorMessage(error: unknown): string | null {
  if (!(error instanceof DOMException) && !(error instanceof Error)) {
    return null;
  }
  return error.message;
}

export function isDatabaseDeletedError(error: unknown): boolean {
  const message = errorMessage(error);
  return message !== null && IDB_DATABASE_DELETED.test(message);
}

export function isDatabaseClosedError(error: unknown): boolean {
  const message = errorMessage(error);
  return message !== null && IDB_DATABASE_CLOSED.test(message);
}

/** Closed or user-deleted IDB — offlineQueue resets the handle and retries once. */
export function isRetriableDatabaseError(error: unknown): boolean {
  return isDatabaseDeletedError(error) || isDatabaseClosedError(error);
}
