export type PlayerRole = "seeker" | "hider" | "observer" | "admin";

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

export function isObserverRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): boolean {
  return resolvePlayerRole(memberRoles, uid) === "observer";
}

export function isAdminRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): boolean {
  return resolvePlayerRole(memberRoles, uid) === "admin";
}

export function isSpectatorRole(
  memberRoles: MemberRoles | undefined,
  uid: string | undefined,
): boolean {
  const role = resolvePlayerRole(memberRoles, uid);
  return role === "observer" || role === "admin";
}

export function sessionHasHiders(memberRoles: MemberRoles | undefined): boolean {
  if (!memberRoles) {
    return false;
  }

  return Object.values(memberRoles).some((role) => role === "hider");
}

export function playerRoleLabel(role: PlayerRole): string {
  switch (role) {
    case "seeker":
      return "Seeker";
    case "hider":
      return "Hider";
    case "observer":
      return "Observer";
    case "admin":
      return "Admin";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
