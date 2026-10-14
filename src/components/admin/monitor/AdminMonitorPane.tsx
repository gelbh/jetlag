import { Alert, Center, Stack } from "@mantine/core";
import { useEffect } from "react";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { AdminMapScreen } from "../../../routes/AdminMapScreen";
import { AdminEmptyState } from "../shared/AdminEmptyState";

export function AdminMonitorPane({
  active,
  errorMessage,
  sessionsUnavailable = false,
}: {
  active: boolean;
  errorMessage?: string | null;
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
          {errorMessage}
        </Alert>
      </Center>
    );
  }

  if (!active) {
    return (
      <Center h="100%" mih={0} p="xl">
        {sessionsUnavailable ? (
          <AdminEmptyState
            title="Start list unavailable"
            body="Games could not be loaded. Use Refresh in the status strip to try again."
          />
        ) : (
          <AdminEmptyState
            title="No course open"
            body="Pick a live game in the start list to watch its map here."
          />
        )}
      </Center>
    );
  }

  return (
    // Container for the rail's cqi width; the stacking context keeps the rail under the Needs you drawer.
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
