const IDB_CONNECTION_CLOSING = /database connection is closing/i;
const WEBKIT_LOAD_FAILED = /^Load failed\b/i;

export function isIdbConnectionClosingMessage(message: string): boolean {
  return IDB_CONNECTION_CLOSING.test(message);
}

export function isWebkitLoadFailedMessage(message: string): boolean {
  return WEBKIT_LOAD_FAILED.test(message.trim());
}
