import { Group, Text } from "@mantine/core";
import { CloudArrowUp } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { JlIcon } from "../ui/brand/JlIcon";

/** Online acks land in ~100–300 ms; only surface writes that are genuinely stuck. */
export const PENDING_SYNC_BADGE_DELAY_MS = 1000;

/**
 * Row-level marker for a local write Firestore has not acked yet (icon + text,
 * never color only). Mount only while pending: each mount restarts the delay.
 */
export function PendingSyncBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), PENDING_SYNC_BADGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Group gap={4} wrap="nowrap" c="var(--color-field-ink)" data-testid="pending-sync-badge">
      <JlIcon icon={CloudArrowUp} size={12} weight="bold" />
      <Text size="xs" fw={500} lh={1.2} c="inherit">
        Waiting to send
      </Text>
    </Group>
  );
}
