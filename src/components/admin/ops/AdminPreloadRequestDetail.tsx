import { Alert, Box, Button, Group, Stack, Text } from "@mantine/core";
import { type ReactNode, useRef, useState } from "react";
import { formatBytes } from "../../../domain/admin/formatBytes";
import { canTransitionPreloadRequestStatus } from "../../../domain/preloadRequest/preloadRequestAdmin";
import type {
  PreloadRequest,
  PreloadRequestStatus,
} from "../../../domain/preloadRequest/preloadRequestTypes";
import { updatePreloadRequestStatus } from "../../../services/preloadRequest/preloadRequestApi";

const ACTION_STATUSES: readonly PreloadRequestStatus[] = [
  "accepted",
  "declined",
  "shipped",
  "open",
];

const ACTION_LABEL: Record<PreloadRequestStatus, string> = {
  accepted: "Accept",
  declined: "Decline",
  shipped: "Mark shipped",
  open: "Reopen",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text
        component="dt"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-ink-muted)",
        }}
      >
        {label}
      </Text>
      <Text
        component="dd"
        m={0}
        style={{ color: "var(--color-ink)", fontWeight: 600, overflowWrap: "anywhere" }}
      >
        {children}
      </Text>
    </div>
  );
}

export function AdminPreloadRequestDetail({ request }: { request: PreloadRequest }) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const snapshot = request.presetSnapshot;

  const onStatus = async (status: PreloadRequestStatus) => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await updatePreloadRequestStatus(request.id, status);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update status.");
    }
    busyRef.current = false;
    setBusy(false);
  };

  return (
    <Stack gap="sm">
      <Box
        component="dl"
        m={0}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px 20px",
          userSelect: "text",
        }}
      >
        <Field label="Place">{snapshot.placeLabel ?? "-"}</Field>
        <Field label="Size / units">
          {snapshot.gameSize} · {snapshot.distanceUnit}
        </Field>
        <Field label="Region pack">{snapshot.regionPackId ?? "-"}</Field>
        <Field label="Preset id">{snapshot.presetId ?? "-"}</Field>
        <Field label="Game area size">{formatBytes(snapshot.gameAreaBytes)}</Field>
        <Field label="Reporter">
          <code>{request.reporterUid}</code>
        </Field>
        <Field label="Note">{request.note?.trim() || "-"}</Field>
        <Field label="Email">
          {request.email?.messageId
            ? `sent (${request.email.messageId})`
            : request.email?.error
              ? `failed: ${request.email.error}`
              : "-"}
        </Field>
        {snapshot.focusBounds ? (
          <Field label="Focus bounds">
            <code>{JSON.stringify(snapshot.focusBounds)}</code>
          </Field>
        ) : null}
      </Box>

      {actionError ? (
        <Alert role="alert" title="Couldn't update request" color="halt">
          {actionError}
        </Alert>
      ) : null}

      <Group gap={8} wrap="wrap">
        {ACTION_STATUSES.filter((status) =>
          canTransitionPreloadRequestStatus(request.status, status),
        ).map((status) => (
          <Button
            key={status}
            type="button"
            h={36}
            radius={12}
            // Accept is the one filled action; the rest stay neutral.
            variant={status === "accepted" ? "filled" : "default"}
            disabled={busy}
            onClick={() => void onStatus(status)}
          >
            {ACTION_LABEL[status]}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}
