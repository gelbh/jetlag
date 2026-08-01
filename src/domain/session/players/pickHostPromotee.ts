import type { PlayerRole } from "./playerRole";

/**
 * Prefer another seeker, else any other member; lexicographic uid tie-break.
 * Returns null when the host is alone.
 *
 * Keep in sync with `functions/session/pickHostPromotee.mjs` (Functions cannot import this TS).
 */
export function pickHostPromotee(
  memberUids: readonly string[] | null | undefined,
  memberRoles: Record<string, PlayerRole | string> | null | undefined,
  hostUid: string,
): string | null {
  const candidates = (Array.isArray(memberUids) ? memberUids : []).filter(
    (uid) => typeof uid === "string" && uid.length > 0 && uid !== hostUid,
  );

  if (candidates.length === 0) {
    return null;
  }

  const roles =
    memberRoles && typeof memberRoles === "object" ? memberRoles : {};

  const seekers = candidates
    .filter((uid) => roles[uid] === "seeker")
    .sort((a, b) => a.localeCompare(b));
  if (seekers.length > 0) {
    return seekers[0] ?? null;
  }

  return [...candidates].sort((a, b) => a.localeCompare(b))[0] ?? null;
}

/**
 * When membership heal removes the current host uid, return the promotee to write.
 * Returns null when hostUid should stay unchanged.
 */
export function resolveHostUidAfterHeal(input: {
  currentHostUid: string;
  memberUidsAfterHeal: readonly string[];
  memberRolesAfterHeal: Record<string, PlayerRole | string>;
  removedUid: string | undefined;
}): string | null {
  const { currentHostUid, memberUidsAfterHeal, memberRolesAfterHeal, removedUid } =
    input;

  if (removedUid == null || removedUid !== currentHostUid) {
    return null;
  }

  if (memberUidsAfterHeal.includes(currentHostUid)) {
    return null;
  }

  return pickHostPromotee(
    memberUidsAfterHeal,
    memberRolesAfterHeal,
    currentHostUid,
  );
}
