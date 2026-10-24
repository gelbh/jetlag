import { Button, Stack, Text } from "@mantine/core";
import type { ModerationAction } from "../useModerationConfirm";

interface ModPanelProps {
  moderationBusy: boolean;
  onModerationAction: (action: ModerationAction) => void;
}

export function ModPanel({ moderationBusy, onModerationAction }: ModPanelProps) {
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Each action asks before it runs.
      </Text>
      <Stack gap="xs">
        <Button
          variant="default"
          disabled={moderationBusy}
          onClick={() => onModerationAction("end")}
        >
          Force end
        </Button>
        <Button
          variant="default"
          disabled={moderationBusy}
          onClick={() => onModerationAction("resetBoard")}
        >
          Reset board
        </Button>
        <Button
          variant="default"
          c="halt"
          disabled={moderationBusy}
          onClick={() => onModerationAction("cleanupCode")}
        >
          Cleanup code
        </Button>
      </Stack>
    </Stack>
  );
}
