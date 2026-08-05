import type { RoleGates } from "../../../domain/session/players/roleGates";
import { visibleRoleCodeRoles } from "../../../domain/session/players/roleGates";
import type { PlayerRole } from "../../../domain/session/players/playerRole";

export type CanOpenMapScreenRoleCodesInput = {
  roleGates: RoleGates | null | undefined;
  memberRoles: Record<string, PlayerRole | string> | undefined;
  myUid: string | null | undefined;
  isHost: boolean;
};

/** Whether Codes is available on map chrome (dock / rail / observer island). */
export function canOpenMapScreenRoleCodes(
  input: CanOpenMapScreenRoleCodesInput,
): boolean {
  return (
    Boolean(input.myUid) &&
    visibleRoleCodeRoles({
      roleGates: input.roleGates,
      memberRoles: input.memberRoles,
      myUid: input.myUid ?? undefined,
      isHost: input.isHost,
    }).length > 0
  );
}
