/**
 * Prefer another seeker, else any other member; lexicographic uid tie-break.
 * Returns null when the host is alone.
 */
export function pickHostPromotee(memberUids, memberRoles, hostUid) {
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
    return seekers[0];
  }

  return [...candidates].sort((a, b) => a.localeCompare(b))[0] ?? null;
}
