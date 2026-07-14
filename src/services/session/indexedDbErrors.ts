const IDB_DATABASE_DELETED = /Database deleted by request of the user/i;

export function isDatabaseDeletedError(error: unknown): boolean {
  if (!(error instanceof DOMException) && !(error instanceof Error)) {
    return false;
  }

  return IDB_DATABASE_DELETED.test(error.message);
}
