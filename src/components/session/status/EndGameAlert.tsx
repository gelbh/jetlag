import { Button } from "@mantine/core";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { MapFloatAlert, MapFloatAlertPanel } from "../../ui/banners/MapFloatAlert";

interface EndGameAlertProps {
  endGameActive: boolean;
  isHost: boolean;
  playerRole: PlayerRole;
  onResetEndGame?: () => void;
}

/** Alert-only End Game banner. Seekers start via Found station (no Accept/Decline). */
export function EndGameAlert({
  endGameActive,
  isHost,
  playerRole,
  onResetEndGame,
}: EndGameAlertProps) {
  if (!endGameActive) {
    return null;
  }

  if (isHost && playerRole !== "hider" && onResetEndGame) {
    return (
      <MapFloatAlertPanel className="pointer-events-auto mx-3 mt-1.5">
        <p className="text-sm font-semibold text-ink">End game started</p>
        <Button
          type="button"
          variant="default"
          size="compact-md"
          onClick={onResetEndGame}
        >
          End end game
        </Button>
      </MapFloatAlertPanel>
    );
  }

  return (
    <MapFloatAlert className="pointer-events-auto mx-3 mt-1.5">
      End game started
    </MapFloatAlert>
  );
}
