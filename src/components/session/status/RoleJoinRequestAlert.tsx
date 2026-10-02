import { Button, Group } from "@mantine/core";
import type { RoleJoinRequest } from "@/domain/session/players/joinRequest";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";

interface RoleJoinRequestAlertProps {
  request: RoleJoinRequest | null;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
  error?: string | null;
}

export function RoleJoinRequestAlert({
  request,
  onAccept,
  onDecline,
  busy = false,
  error = null,
}: RoleJoinRequestAlertProps) {
  if (!request) {
    return null;
  }

  return (
    <MapFloatSurface
      tone="default"
      role="alert"
      actionRow
      className="pointer-events-auto mx-3 mt-1.5"
      data-testid="role-join-request-alert"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {request.identityLabel} wants to join as {playerRoleLabel(request.role)}
        </p>
        {error ? <p className="text-sm text-status-error">{error}</p> : null}
      </div>
      <Group gap="sm" wrap="nowrap">
        <Button type="button" variant="default" size="md" disabled={busy} onClick={onDecline}>
          Decline
        </Button>
        <Button type="button" variant="filled" size="md" disabled={busy} onClick={onAccept}>
          Accept
        </Button>
      </Group>
    </MapFloatSurface>
  );
}
