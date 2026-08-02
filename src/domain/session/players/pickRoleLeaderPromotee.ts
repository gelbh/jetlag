import type { PlayerRole } from "./playerRole";

/**
 * Pick the next role leader among members with the given role (lexicographic uid).
 * Returns null when no candidates remain after excluding the leaver.
 *
 * Keep in sync with `functions/session/pickRoleLeaderPromotee.mjs`.
 */
export function pickRoleLeaderPromotee(
  memberUids: readonly string[] | null | undefined,
  memberRoles: Record<string, PlayerRole | string> | null | undefined,
  role: PlayerRole,
  excludeUid: string,
): string | null {
  const roles =
    memberRoles && typeof memberRoles === "object" ? memberRoles : {};
  const candidates = (Array.isArray(memberUids) ? memberUids : [])
    .filter(
      (uid) =>
        typeof uid === "string" &&
        uid.length > 0 &&
        uid !== excludeUid &&
        roles[uid] === role,
    )
    .sort((a, b) => a.localeCompare(b));

  return candidates[0] ?? null;
}
