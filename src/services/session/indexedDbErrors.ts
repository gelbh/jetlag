const IDB_DATABASE_DELETED = /Database deleted by request of the user/i;
const IDB_CONNECTION_CLOSING = /database connection is closing/i;

export function isDatabaseDeletedError(error: unknown): boolean {
  if (!(error instanceof DOMException) && !(error instanceof Error)) {
    return false;
  }

  return IDB_DATABASE_DELETED.test(error.message);
}

export function isIdbConnectionClosingMessage(message: string): boolean {
  return IDB_CONNECTION_CLOSING.test(message);
}

export function isIdbConnectionClosingError(error: unknown): boolean {
  if (!(error instanceof DOMException) && !(error instanceof Error)) {
    return false;
  }

  return isIdbConnectionClosingMessage(error.message);
}
