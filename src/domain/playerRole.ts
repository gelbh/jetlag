export type PlayerRole = "seeker" | "hider";

export type MemberRoles = Record<string, PlayerRole>;

export function resolvePlayerRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): PlayerRole {
  if (!uid) {
    return "seeker";
  }

  if (!memberRoles || Object.keys(memberRoles).length === 0) {
    return "seeker";
  }

  return memberRoles[uid] ?? "seeker";
}

export function isSeekerRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): boolean {
  return resolvePlayerRole(memberRoles, uid) === "seeker";
}

export function isHiderRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): boolean {
  return resolvePlayerRole(memberRoles, uid) === "hider";
}

export function sessionHasHiders(memberRoles: MemberRoles | undefined): boolean {
  if (!memberRoles) {
    return false;
  }

  return Object.values(memberRoles).some((role) => role === "hider");
}

export function playerRoleLabel(role: PlayerRole): string {
  return role === "seeker" ? "Seeker" : "Hider";
}
