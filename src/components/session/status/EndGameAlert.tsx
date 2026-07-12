import type { PlayerRole } from "../../../domain/session/playerRole";
import { MapFloatAlert, MapFloatAlertPanel } from "../../ui/MapFloatAlert";

interface EndGameAlertProps {
  endGamePending: boolean;
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

export function EndGameAlert({
  endGamePending,
  endGameActive,
  playerRole,
  endGameRequestedByUid,
  myUid,
  isHost,
  onAcceptEndGame,
  onResetEndGame,
}: EndGameAlertProps) {
  if (endGamePending) {
    if (playerRole === "hider" && onAcceptEndGame) {
      return (
        <MapFloatAlertPanel className={endGamePanelClassName}>
          <p className="text-sm font-semibold text-ink">
            Seekers requested end game
          </p>
          <div className="flex shrink-0 gap-2">
            {onResetEndGame ? (
              <button
                type="button"
                onClick={onResetEndGame}
                className="btn-secondary min-h-10 px-3 text-xs"
              >
                Decline
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAcceptEndGame}
              className="btn-primary min-h-10 shrink-0 px-3 text-xs"
            >
              Accept
            </button>
          </div>
        </MapFloatAlertPanel>
      );
    }

    if (myUid && endGameRequestedByUid === myUid && onResetEndGame) {
      return (
        <MapFloatAlertPanel className={endGamePanelClassName}>
          <p className="text-sm font-semibold text-ink">
            Waiting for hider to accept end game
          </p>
          <button
            type="button"
            onClick={onResetEndGame}
            className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
          >
            Cancel request
          </button>
        </MapFloatAlertPanel>
      );
    }

    if (isHost && onResetEndGame) {
      return (
        <MapFloatAlertPanel className={endGamePanelClassName}>
          <p className="text-sm font-semibold text-ink">
            End game pending hider acceptance
          </p>
          <button
            type="button"
            onClick={onResetEndGame}
            className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
          >
            Cancel end game
          </button>
        </MapFloatAlertPanel>
      );
    }

    return (
      <MapFloatAlert className="pointer-events-auto mx-3 mt-1.5 normal-case tracking-normal">
        Waiting for hider to accept end game
      </MapFloatAlert>
    );
  }

  if (endGameActive) {
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

  return null;
}
