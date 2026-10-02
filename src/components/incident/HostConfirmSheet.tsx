import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { HostConfirmRecord } from "../../domain/incident/incidentTypes";
import { approveHostConfirm, denyHostConfirm } from "../../services/incident/incidentApi";
import { SheetHeader } from "../ui/sheets/SheetHeader";
import { SheetHost } from "../ui/sheets/SheetHost";

function formatToolLabel(tool: string): string {
  return tool.replaceAll("_", " ");
}

export interface HostConfirmSheetProps {
  open: boolean;
  confirm: HostConfirmRecord | null;
  onClose: () => void;
  /** Injectable for tests. */
  approveFn?: (incidentId: string, confirmId: string) => Promise<unknown>;
  denyFn?: (incidentId: string, confirmId: string) => Promise<unknown>;
}

/**
 * Broadcast-HUD sheet asking the session host to approve a destructive
 * session-ops action. Approve runs the callable (execute once); dismiss denies.
 */
export function HostConfirmSheet({
  open,
  confirm,
  onClose,
  approveFn = approveHostConfirm,
  denyFn = denyHostConfirm,
}: HostConfirmSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!confirm || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approveFn(confirm.incidentId, confirm.id);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not approve the change.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeny = async () => {
    if (!confirm || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await denyFn(confirm.incidentId, confirm.id);
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not dismiss the confirmation.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetHost
      open={open}
      onClose={() => {
        void handleDeny();
      }}
      ariaLabel="Host confirmation"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,520px)]"
      dismissible={!busy}
    >
      {open && confirm ? (
        <Stack gap="md" className="px-4 pb-5">
          <SheetHeader
            title="Confirm change"
            eyebrow="Host"
            onClose={() => {
              void handleDeny();
            }}
            closeLabel="Not now"
          />
          <Text size="sm" c="var(--color-ink-muted)" style={{ lineHeight: 1.4 }}>
            A fix agent wants to run{" "}
            <Text
              span
              fw={600}
              tt="uppercase"
              c="var(--color-ink)"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em",
              }}
            >
              {formatToolLabel(confirm.tool)}
            </Text>{" "}
            on this session. Only you (the host) can approve.
          </Text>
          {error ? (
            <Text
              size="sm"
              c="var(--color-danger, #b42318)"
              role="alert"
              style={{ fontSize: "0.8125rem" }}
            >
              {error}
            </Text>
          ) : null}
          <Group justify="flex-end" gap="md" wrap="wrap">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => {
                void handleDeny();
              }}
            >
              Not now
            </Button>
            <Button
              variant="filled"
              disabled={busy}
              onClick={() => {
                void handleApprove();
              }}
            >
              {busy ? "Working…" : "Approve"}
            </Button>
          </Group>
        </Stack>
      ) : null}
    </SheetHost>
  );
}
