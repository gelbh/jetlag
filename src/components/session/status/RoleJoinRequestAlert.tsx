import type { RoleJoinRequest } from "../../../domain/session/players/joinRequest";
import { playerRoleLabel } from "../../../domain/session/players/playerRole";
import { MapFloatAlertPanel } from "../../ui/banners/MapFloatAlert";

interface RoleJoinRequestAlertProps {
  request: RoleJoinRequest | null;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}

const joinRequestPanelClassName =
  "pointer-events-auto mx-3 mt-1.5 border-highlight/55 bg-surface-deep";

export function RoleJoinRequestAlert({
  request,
  onAccept,
  onDecline,
  busy = false,
}: RoleJoinRequestAlertProps) {
  if (!request) {
    return null;
  }

  return (
    <MapFloatAlertPanel className={joinRequestPanelClassName}>
      <p className="text-sm font-semibold text-ink">
        {request.identityLabel} wants to join as {playerRoleLabel(request.role)}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onDecline}
          className="btn-secondary min-h-10 px-3 text-xs"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="btn-primary min-h-10 shrink-0 px-3 text-xs"
        >
          Accept
        </button>
      </div>
    </MapFloatAlertPanel>
  );
}
