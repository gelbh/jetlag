import type { SessionRecord } from "../../map/annotations";
import type { CastleSiegeRoles, CastleSiegeTeamRole } from "../castleSiege/teamRole";
import { isPlaceholderGameArea } from "../join/joinPreviewGameArea";
import type { JoinRequestRole } from "./joinRequest";
import type { PlayerRole } from "./playerRole";

/** Classic keys (seeker/hider) and CS keys (teamA/teamB) coexist by session mode, not mixed on one session. */
export type RoleGates = {
  version: 1;
  leaders: {
    seeker?: string;
    hider?: string;
    teamA?: string;
    teamB?: string;
  };
};

const CASTLE_SIEGE_PLAYING_TEAM_MAX = 4;
const CASTLE_SIEGE_REFEREE_MAX = 1;

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
  if (!input.myUid || !isSessionRoleGated({ roleGates: input.roleGates ?? undefined })) {
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
  memberRoles?: Record<string, PlayerRole | string>;
  myUid: string | undefined;
  isHost: boolean;
}): JoinRequestRole[] {
  if (!input.myUid || !isSessionRoleGated({ roleGates: input.roleGates ?? undefined })) {
    return [];
  }

  const roles: JoinRequestRole[] = [];
  if (input.isHost) {
    roles.push("observer");
  }

  const myRole = input.memberRoles?.[input.myUid];
  if (
    (myRole === "seeker" || myRole === "hider") &&
    input.roleGates?.leaders?.[myRole] === input.myUid
  ) {
    roles.push(myRole);
  }

  return roles;
}

export function countMembersWithRole(
  memberRoles: Record<string, PlayerRole | string> | undefined,
  role: PlayerRole,
): number {
  if (!memberRoles) {
    return 0;
  }

  return Object.values(memberRoles).filter((memberRole) => memberRole === role).length;
}

export function joinRequiresRolePasscode(
  memberRoles: Record<string, PlayerRole | string> | undefined,
  role: PlayerRole,
  uid: string | undefined,
  occupancyKnown = true,
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

  if (!occupancyKnown) {
    return true;
  }

  return countMembersWithRole(memberRoles, role) > 0;
}

export function buildRoleGatesForHost(hostUid: string, hostRole: PlayerRole): RoleGates {
  const leaders: RoleGates["leaders"] = {};

  if (hostRole === "seeker" || hostRole === "hider") {
    leaders[hostRole] = hostUid;
  }

  return { version: 1, leaders };
}

export function isRolePasscodeRequired(
  previewSession: Pick<SessionRecord, "memberRoles" | "gameArea"> | null | undefined,
  role: PlayerRole,
  uid: string | undefined,
): boolean {
  if (!previewSession) {
    return false;
  }

  if (role === "observer") {
    return true;
  }

  if (isPlaceholderGameArea(previewSession.gameArea)) {
    return false;
  }

  return joinRequiresRolePasscode(previewSession.memberRoles, role, uid, true);
}

export function countCastleSiegeSeat(
  roles: CastleSiegeRoles | undefined,
  seat: CastleSiegeTeamRole,
): number {
  if (!roles) {
    return 0;
  }

  return Object.values(roles).filter((memberSeat) => memberSeat === seat).length;
}

export function joinRequiresCastleSiegePasscode(
  roles: CastleSiegeRoles | undefined,
  seat: CastleSiegeTeamRole,
  uid: string | undefined,
  occupancyKnown = true,
): boolean {
  const existingSeat = uid ? roles?.[uid] : undefined;
  if (existingSeat === seat) {
    return false;
  }

  if (seat === "observer" || seat === "referee") {
    return true;
  }

  if (!occupancyKnown) {
    return true;
  }

  return countCastleSiegeSeat(roles, seat) > 0;
}

export function isCastleSiegeSeatFull(
  roles: CastleSiegeRoles | undefined,
  seat: CastleSiegeTeamRole,
): boolean {
  if (seat === "observer") {
    return false;
  }

  const count = countCastleSiegeSeat(roles, seat);
  if (seat === "referee") {
    return count >= CASTLE_SIEGE_REFEREE_MAX;
  }

  if (seat === "teamA" || seat === "teamB") {
    return count >= CASTLE_SIEGE_PLAYING_TEAM_MAX;
  }

  return false;
}

export function buildRoleGatesForCastleSiegeHost(
  hostUid: string,
  hostSeat: "teamA" | "teamB",
): RoleGates {
  return {
    version: 1,
    leaders: { [hostSeat]: hostUid },
  };
}
