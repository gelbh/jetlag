import type { SessionRecord } from "../../map/annotations";
import type { JoinRequestRole } from "./joinRequest";
import type { PlayerRole } from "./playerRole";

export type RoleGates = {
  version: 1;
  leaders: {
    seeker?: string;
    hider?: string;
  };
};

export function isSessionRoleGated(
  session: Pick<SessionRecord, "roleGates"> | null | undefined,
): boolean {
  return session?.roleGates?.version === 1;
}

export function ledJoinRequestRoles(input: {
  roleGates?: RoleGates | null;
  myUid: string | undefined;
  isHost: boolean;
}): JoinRequestRole[] {
  if (
    !input.myUid ||
    !isSessionRoleGated({ roleGates: input.roleGates ?? undefined })
  ) {
    return [];
  }

  const roles: JoinRequestRole[] = [];
  if (input.roleGates?.leaders?.seeker === input.myUid) {
    roles.push("seeker");
  }
  if (input.roleGates?.leaders?.hider === input.myUid) {
    roles.push("hider");
  }
  if (input.isHost) {
    roles.push("observer");
  }
  return roles;
}

export function visibleRoleCodeRoles(input: {
  roleGates?: RoleGates | null;
  myUid: string | undefined;
  isHost: boolean;
}): JoinRequestRole[] {
  return ledJoinRequestRoles(input);
}

export function countMembersWithRole(
  memberRoles: Record<string, PlayerRole | string> | undefined,
  role: PlayerRole,
): number {
  if (!memberRoles) {
    return 0;
  }

  return Object.values(memberRoles).filter((memberRole) => memberRole === role)
    .length;
}

export function joinRequiresRolePasscode(
  memberRoles: Record<string, PlayerRole | string> | undefined,
  role: PlayerRole,
  uid: string | undefined,
): boolean {
  if (role === "observer") {
    return true;
  }

  if (role !== "seeker" && role !== "hider") {
    return false;
  }

  const existingRole = uid ? memberRoles?.[uid] : undefined;
  if (existingRole === role) {
    return false;
  }

  // Always collect — join preview often lacks memberRoles for non-members.
  // Empty side: leave blank; occupied side: server rejects missing/wrong codes.
  return true;
}

export function buildRoleGatesForHost(
  hostUid: string,
  hostRole: PlayerRole,
): RoleGates {
  const leaders: RoleGates["leaders"] = {};

  if (hostRole === "seeker" || hostRole === "hider") {
    leaders[hostRole] = hostUid;
  }

  return { version: 1, leaders };
}
