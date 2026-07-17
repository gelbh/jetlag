const WEBKIT_LOAD_FAILED = /^Load failed$/i;

export function isWebkitLoadFailedMessage(
  type: string | undefined,
  message: string,
): boolean {
  return type === "TypeError" && WEBKIT_LOAD_FAILED.test(message.trim());
}
