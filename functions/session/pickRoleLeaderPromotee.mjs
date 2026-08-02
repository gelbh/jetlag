/**
 * Pick the next role leader among members with the given role (lexicographic uid).
 * Keep in sync with `src/domain/session/players/pickRoleLeaderPromotee.ts`.
 */
export function pickRoleLeaderPromotee(
  memberUids,
  memberRoles,
  role,
  excludeUid,
) {
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
