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
