import { Group, Text } from "@mantine/core";
import { ClockClockwise } from "@phosphor-icons/react";
import { JlIcon } from "../ui/brand/JlIcon";

/** Row-level marker for a local write Firestore has not acked yet (icon + text, never color only). */
export function PendingSyncBadge() {
  return (
    <Group
      gap={4}
      wrap="nowrap"
      c="var(--color-field-ink-muted)"
      data-testid="pending-sync-badge"
    >
      <JlIcon icon={ClockClockwise} size={12} weight="bold" />
      <Text size="xs" fw={500} lh={1.2} c="inherit">
        Waiting to send
      </Text>
    </Group>
  );
}
