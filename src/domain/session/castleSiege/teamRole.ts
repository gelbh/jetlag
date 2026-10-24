import type { CastleSiegePlayingTeam } from "./pregame";

export type CastleSiegeTeamRole = "teamA" | "teamB" | "referee" | "observer";
export type CastleSiegeRoles = Record<string, CastleSiegeTeamRole>;

export function resolveCastleSiegeRole(
  roles: CastleSiegeRoles | undefined,
  uid: string | undefined,
): CastleSiegeTeamRole | null {
  if (!roles || !uid) return null;
  const role = roles[uid];
  return role ?? null;
}

export function isCastleSiegePlayingRole(role: CastleSiegeTeamRole | null): boolean {
  return role === "teamA" || role === "teamB";
}

export function opposingCastleSiegePlayingTeam(
  team: CastleSiegePlayingTeam,
): CastleSiegePlayingTeam {
  return team === "teamA" ? "teamB" : "teamA";
}
