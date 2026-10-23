import { Alert, Button, Center, Loader, Stack } from "@mantine/core";
import { useEffect } from "react";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { AdminMapScreen } from "../../../routes/AdminMapScreen";
import { AdminEmptyState } from "../shared/AdminEmptyState";

export function AdminMonitorPane({
  active,
  errorMessage,
  joining = false,
  onRetry,
  sessionsUnavailable = false,
}: {
  active: boolean;
  errorMessage?: string | null;
  /** The join for this session is in flight: show progress instead of the idle hint. */
  joining?: boolean;
  onRetry?: () => void;
  sessionsUnavailable?: boolean;
}) {
  const setFocusedPlayerUid = useAdminMonitorFocus((state) => state.setFocusedPlayerUid);

  useEffect(() => {
    if (!active) {
      setFocusedPlayerUid(null);
    }
  }, [active, setFocusedPlayerUid]);

  if (errorMessage) {
    return (
      <Center h="100%" mih={0} p="xl">
        <Alert role="alert" title="Monitor unavailable" data-tone="mispunch" maw={384}>
          <Stack gap="xs" align="flex-start">
            {errorMessage}
            {onRetry ? (
              <Button type="button" variant="default" size="compact-sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </Stack>
        </Alert>
      </Center>
    );
  }

  if (!active) {
    return (
      <Center h="100%" mih={0} p="xl">
        {joining ? (
          <Stack align="center" gap="xs" role="status" aria-label="Opening the map">
            <Loader size="sm" />
          </Stack>
        ) : sessionsUnavailable ? (
          <AdminEmptyState
            title="Sessions unavailable"
            body="Games could not be loaded. Use Refresh in the status strip to try again."
          />
        ) : (
          <AdminEmptyState
            title="No course open"
            body="Open a live game from the table to watch its map here."
          />
        )}
      </Center>
    );
  }

  return (
    // Container for the rail's cqi width; the stacking context keeps the rail under dialogs.
    <Stack
      style={{ containerType: "inline-size", isolation: "isolate" }}
      gap={0}
      h="100%"
      mih={0}
      data-testid="admin-monitor-fixed"
    >
      <AdminMapScreen embeddedMonitor />
    </Stack>
  );
}
