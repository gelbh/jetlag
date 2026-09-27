import { Button, Group } from "@mantine/core";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { MapFloatAlert } from "../../ui/banners/MapFloatAlert";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";

interface FoundHiderAlertProps {
  foundHiderPending: boolean;
  playerRole: PlayerRole;
  foundRequestedByUid?: string;
  myUid?: string;
  isHost: boolean;
  onAcceptFoundHider?: () => void;
  onDeclineFoundHider?: () => void;
}

const foundHiderPanelClassName = "pointer-events-auto mx-3 mt-1.5";

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
      <MapFloatSurface
        tone="flag"
        role="alert"
        actionRow
        className={foundHiderPanelClassName}
      >
        <p className="text-sm font-semibold text-ink">
          Seekers say you&apos;re found
        </p>
        <Group gap="sm" wrap="nowrap">
          {onDeclineFoundHider ? (
            <Button
              type="button"
              variant="default"
              size="compact-md"
              onClick={onDeclineFoundHider}
            >
              Decline
            </Button>
          ) : null}
          <Button
            type="button"
            variant="filled"
            size="compact-md"
            onClick={onAcceptFoundHider}
          >
            Accept
          </Button>
        </Group>
      </MapFloatSurface>
    );
  }

  if (myUid && foundRequestedByUid === myUid && onDeclineFoundHider) {
    return (
      <MapFloatSurface
        tone="flag"
        role="alert"
        actionRow
        className={foundHiderPanelClassName}
      >
        <p className="text-sm font-semibold text-ink">
          Waiting for hider to confirm found hider
        </p>
        <Button
          type="button"
          variant="default"
          size="compact-md"
          onClick={onDeclineFoundHider}
        >
          Cancel request
        </Button>
      </MapFloatSurface>
    );
  }

  if (isHost && onDeclineFoundHider) {
    return (
      <MapFloatSurface
        tone="flag"
        role="alert"
        actionRow
        className={foundHiderPanelClassName}
      >
        <p className="text-sm font-semibold text-ink">
          Found hider pending hider confirmation
        </p>
        <Button
          type="button"
          variant="default"
          size="compact-md"
          onClick={onDeclineFoundHider}
        >
          Cancel found hider
        </Button>
      </MapFloatSurface>
    );
  }

  return (
    <MapFloatAlert className={foundHiderPanelClassName}>
      Waiting for hider to confirm found hider
    </MapFloatAlert>
  );
}
