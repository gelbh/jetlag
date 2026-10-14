import { Text } from "@mantine/core";

export function AdminSettingsPanel() {
  return (
    <Text size="sm" c="dimmed" maw="65ch" data-testid="admin-settings-panel">
      The session list refreshes every 30 seconds while this tab is visible. Use Refresh to update
      now, or load more at the bottom of the list. Monitoring uses realtime listeners while a
      session is selected.
    </Text>
  );
}
