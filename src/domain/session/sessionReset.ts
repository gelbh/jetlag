export function isStaleAfterReset(
  recordAt: string | undefined,
  sessionResetAt: string | undefined,
): boolean {
  if (!sessionResetAt) {
    return false;
  }

  if (!recordAt) {
    return true;
  }

  return recordAt < sessionResetAt;
}

export function filterExtrasAfterReset<T>(
  items: readonly T[],
  sessionResetAt: string | undefined,
  pickTimestamp: (item: T) => string | undefined,
): T[] {
  if (!sessionResetAt) {
    return [...items];
  }

  return items.filter(
    (item) => !isStaleAfterReset(pickTimestamp(item), sessionResetAt),
  );
}
