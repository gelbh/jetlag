import { Button, Stack, Text } from "@mantine/core";

const MISPUNCH = "var(--adm-mispunch, var(--color-halt))";

interface ModPanelProps {
  moderationBusy: boolean;
  moderationError: string | null;
  onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => void;
}

export function ModPanel({ moderationBusy, moderationError, onModerationAction }: ModPanelProps) {
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Moderation actions apply immediately to the live session.
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
          c={MISPUNCH}
          disabled={moderationBusy}
          onClick={() => onModerationAction("cleanupCode")}
        >
          Cleanup code
        </Button>
      </Stack>
      {moderationError ? (
        <Text size="sm" c={MISPUNCH} role="alert">
          {moderationError}
        </Text>
      ) : null}
    </Stack>
  );
}
