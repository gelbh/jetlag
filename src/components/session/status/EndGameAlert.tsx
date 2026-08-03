import type { PlayerRole } from "../../../domain/session/players/playerRole";
import { MapFloatAlert, MapFloatAlertPanel } from "../../ui/banners/MapFloatAlert";

interface EndGameAlertProps {
  endGamePending?: boolean;
  endGameActive: boolean;
  playerRole: PlayerRole;
  endGameRequestedByUid?: string;
  myUid?: string;
  isHost: boolean;
  onAcceptEndGame?: () => void;
  onResetEndGame?: () => void;
}

const endGamePanelClassName =
  "pointer-events-auto mx-3 mt-1.5 border-highlight bg-surface-deep";

/**
 * End Game banner only. Accept/Decline pending UX is removed — seekers start
 * End Game directly via Found station.
 */
export function EndGameAlert({
  endGameActive,
  isHost,
  onResetEndGame,
}: EndGameAlertProps) {
  if (!endGameActive) {
    return null;
  }

  if (isHost && onResetEndGame) {
    return (
      <MapFloatAlertPanel className={endGamePanelClassName}>
        <p className="text-sm font-semibold text-ink">End game started</p>
        <button
          type="button"
          onClick={onResetEndGame}
          className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
        >
          End end game
        </button>
      </MapFloatAlertPanel>
    );
  }

  return (
    <MapFloatAlert className="pointer-events-auto mx-3 mt-1.5 normal-case tracking-normal">
      End game started
    </MapFloatAlert>
  );
}
