/**
 * Only honor a returning-member heal when the client persisted the prior UID locally.
 */
export function sanitizeReturningMemberUid(
  persistedMyUid: string | null | undefined,
  candidate: string | null | undefined,
): string | undefined {
  if (
    typeof persistedMyUid !== "string" ||
    persistedMyUid.length === 0 ||
    typeof candidate !== "string" ||
    candidate.length === 0
  ) {
    return undefined;
  }

  return persistedMyUid === candidate ? candidate : undefined;
}

export function memberUidSetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((uid, index) => uid === sortedRight[index]);
}

export function buildMemberUidsAfterHeal(
  existingMemberUids: readonly string[],
  uid: string,
  returningMemberUid?: string,
): string[] {
  const withoutReturning =
    returningMemberUid != null
      ? existingMemberUids.filter((memberUid) => memberUid !== returningMemberUid)
      : [...existingMemberUids];

  return Array.from(new Set([...withoutReturning, uid]));
}
