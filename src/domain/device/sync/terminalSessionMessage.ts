const TERMINAL_SESSION_MESSAGE_FRAGMENTS = [
  "session no longer exists",
  "session has ended",
  "no access to that session",
  "no access to this session",
  "session is no longer available",
] as const;

export function isTerminalSessionSyncMessage(
  message: string | null | undefined,
): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return TERMINAL_SESSION_MESSAGE_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}
