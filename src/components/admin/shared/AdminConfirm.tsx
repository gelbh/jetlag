import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";

export interface AdminConfirmProps {
  opened: boolean;
  title: string;
  /** One plain sentence naming the target (session code when there is one) and the effect. */
  consequence: string;
  confirmLabel: string;
  busyLabel?: string;
  destructive?: boolean;
  /** Throw to report failure; the modal shows the message and stays open. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Confirm step for irreversible admin actions. Theme-neutral: standalone /map renders it too. */
export function AdminConfirm({
  opened,
  title,
  consequence,
  confirmLabel,
  busyLabel = "Working…",
  destructive = false,
  onConfirm,
  onClose,
}: AdminConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setBusy(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
      setBusy(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={title}
      centered
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
    >
      <Stack gap="md">
        <Text size="sm">{consequence}</Text>
        {error ? (
          <Text size="sm" c="red" role="alert">
            {error}
          </Text>
        ) : null}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={close} disabled={busy} data-autofocus>
            Cancel
          </Button>
          <Button
            color={destructive ? "red" : undefined}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
