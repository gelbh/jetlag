import type { PlayerRole } from "../../../domain/session/playerRole";
import { MapFloatAlert, MapFloatAlertPanel } from "../../ui/MapFloatAlert";

interface FoundHiderAlertProps {
  foundHiderPending: boolean;
  playerRole: PlayerRole;
  foundRequestedByUid?: string;
  myUid?: string;
  isHost: boolean;
  onAcceptFoundHider?: () => void;
  onDeclineFoundHider?: () => void;
}

const foundHiderPanelClassName =
  "pointer-events-auto mx-3 mt-1.5 border-status-success/40 bg-status-success-surface";

const foundHiderBannerClassName =
  "pointer-events-auto mx-3 mt-1.5 normal-case tracking-normal border-status-success/40 bg-status-success-surface text-ink";

export function FoundHiderAlert({
  foundHiderPending,
  playerRole,
  foundRequestedByUid,
  myUid,
  isHost,
  onAcceptFoundHider,
  onDeclineFoundHider,
}: FoundHiderAlertProps) {
  if (!foundHiderPending) {
    return null;
  }

  if (playerRole === "hider" && onAcceptFoundHider) {
    return (
      <MapFloatAlertPanel className={foundHiderPanelClassName}>
        <p className="text-sm font-semibold text-ink">
          Seekers say you&apos;re found
        </p>
        <div className="flex shrink-0 gap-2">
          {onDeclineFoundHider ? (
            <button
              type="button"
              onClick={onDeclineFoundHider}
              className="btn-secondary min-h-10 px-3 text-xs"
            >
              Decline
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAcceptFoundHider}
            className="btn-primary min-h-10 shrink-0 px-3 text-xs"
          >
            Accept
          </button>
        </div>
      </MapFloatAlertPanel>
    );
  }

  if (myUid && foundRequestedByUid === myUid && onDeclineFoundHider) {
    return (
      <MapFloatAlertPanel className={foundHiderPanelClassName}>
        <p className="text-sm font-semibold text-ink">
          Waiting for hider to confirm found hider
        </p>
        <button
          type="button"
          onClick={onDeclineFoundHider}
          className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
        >
          Cancel request
        </button>
      </MapFloatAlertPanel>
    );
  }

  if (isHost && onDeclineFoundHider) {
    return (
      <MapFloatAlertPanel className={foundHiderPanelClassName}>
        <p className="text-sm font-semibold text-ink">
          Found hider pending hider confirmation
        </p>
        <button
          type="button"
          onClick={onDeclineFoundHider}
          className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
        >
          Cancel found hider
        </button>
      </MapFloatAlertPanel>
    );
  }

  return (
    <MapFloatAlert className={foundHiderBannerClassName}>
      Waiting for hider to confirm found hider
    </MapFloatAlert>
  );
}
