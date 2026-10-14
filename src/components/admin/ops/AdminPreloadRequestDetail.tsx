import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { type ReactNode, useRef, useState } from "react";
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text component="dt" size="xs" c="dimmed">
        {label}
      </Text>
      <Text component="dd" size="sm" m={0}>
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
      <Stack component="dl" gap="xs" m={0}>
        <Field label="Place">{snapshot.placeLabel ?? "-"}</Field>
        <Field label="Size / units">
          {snapshot.gameSize} · {snapshot.distanceUnit}
        </Field>
        <Field label="Region pack">{snapshot.regionPackId ?? "-"}</Field>
        <Field label="Preset id">{snapshot.presetId ?? "-"}</Field>
        <Field label="Game area bytes">{snapshot.gameAreaBytes ?? "-"}</Field>
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
      </Stack>

      {actionError ? (
        <Alert role="alert" title="Couldn't update request" data-tone="mispunch">
          {actionError}
        </Alert>
      ) : null}

      <Group gap="xs" wrap="wrap">
        {ACTION_STATUSES.filter((status) =>
          canTransitionPreloadRequestStatus(request.status, status),
        ).map((status) => (
          <Button
            key={status}
            type="button"
            variant="default"
            size="compact-sm"
            disabled={busy}
            onClick={() => void onStatus(status)}
          >
            Mark {status}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}
