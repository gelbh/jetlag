import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { JETLAG_MODAL_Z_INDEX } from "../../theme/theme";

export type AdminPresetDialogMode = "save" | "rename" | "overwrite";

interface AdminPresetDialogProps {
  open: boolean;
  mode: AdminPresetDialogMode;
  initialName?: string;
  title: string;
  confirmLabel: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function AdminPresetDialog({
  open,
  mode,
  initialName = "",
  title,
  confirmLabel,
  onConfirm,
  onCancel,
}: AdminPresetDialogProps) {
  const [name, setName] = useState(initialName);

  return (
    <Modal
      opened={open}
      onClose={onCancel}
      title={title}
      centered
      withCloseButton={false}
      closeOnClickOutside
      closeOnEscape
      zIndex={JETLAG_MODAL_Z_INDEX}
      data-testid="admin-ops-preset-dialog"
      data-mode={mode}
    >
      <Stack gap="md">
        {mode === "overwrite" ? (
          <Text size="sm">Replace “{initialName}” with the current desk layout?</Text>
        ) : (
          <TextInput
            label="Name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            data-autofocus
            autoFocus
          />
        )}
        <Group justify="flex-end" gap="sm">
          <Button type="button" variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mode !== "overwrite" && name.trim().length === 0}
            onClick={() => {
              if (mode === "overwrite") {
                onConfirm(initialName);
                return;
              }
              onConfirm(name);
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
