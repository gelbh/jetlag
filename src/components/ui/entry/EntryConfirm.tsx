import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryStyles";
import { usePlayerPhoneShellPortalTarget } from "@/components/ui/layout/PlayerPhoneShellPortalContext";

export interface EntryConfirmProps {
  opened: boolean;
  title: string;
  consequence: string;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** In-theme confirm for entry / Home flows (replaces window.confirm). */
export function EntryConfirm({
  opened,
  title,
  consequence,
  confirmLabel,
  busyLabel = "Working…",
  onConfirm,
  onClose,
}: EntryConfirmProps) {
  const portalTarget = usePlayerPhoneShellPortalTarget();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) {
      return;
    }
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
      portalProps={portalTarget ? { target: portalTarget } : undefined}
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
    >
      <Stack gap="md">
        <Text size="sm" style={{ textWrap: "pretty" }}>
          {consequence}
        </Text>
        {error ? (
          <Text size="sm" c="red" role="alert">
            {error}
          </Text>
        ) : null}
        <Group justify="flex-end" gap="xs">
          <Button
            variant="default"
            onClick={close}
            disabled={busy}
            styles={grayStyles}
            data-autofocus
          >
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void confirm()} styles={filledStyles}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
