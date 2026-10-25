import type { SessionMode } from "../../../domain/session/castleSiege/mode";
import type { CastleSiegeRoles } from "../../../domain/session/castleSiege/teamRole";
import type { PlayerRole } from "../../../domain/session/players/playerRole";
import type { RoleGates } from "../../../domain/session/players/roleGates";
import { visibleRoleCodeRoles } from "../../../domain/session/players/roleGates";

export type CanOpenMapScreenRoleCodesInput = {
  roleGates: RoleGates | null | undefined;
  memberRoles: Record<string, PlayerRole | string> | undefined;
  castleSiegeRoles?: CastleSiegeRoles;
  mode?: SessionMode;
  myUid: string | null | undefined;
  isHost: boolean;
};

export function canOpenMapScreenRoleCodes(input: CanOpenMapScreenRoleCodesInput): boolean {
  return (
    Boolean(input.myUid) &&
    visibleRoleCodeRoles({
      roleGates: input.roleGates,
      memberRoles: input.memberRoles,
      castleSiegeRoles: input.castleSiegeRoles,
      mode: input.mode,
      myUid: input.myUid ?? undefined,
      isHost: input.isHost,
    }).length > 0
  );
}
