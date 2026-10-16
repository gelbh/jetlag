import { Alert, Button, Group, NativeSelect, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { APP_VERSION } from "../../../domain/device/changelog";
import type {
  IncidentCodingAgentState,
  IncidentMitigationType,
  IncidentStatus,
} from "../../../domain/incident/incidentTypes";
import {
  DEFAULT_HOTFIX_GRACE_SECONDS,
  INCIDENT_MITIGATION_OPTIONS,
} from "../../../services/admin/adminIncidents";
import {
  applyIncidentMitigation,
  launchIncidentCursorAgent,
  publishIncidentHotfix,
  updateIncidentStatus,
} from "../../../services/incident/incidentApi";
import { toneColor } from "../../../theme/adminTone";
import { AdminConfirm } from "../shared/AdminConfirm";
import { AdminIncidentCursorLaunch } from "./AdminIncidentCursorLaunch";

const CLOSEABLE = new Set<IncidentStatus>(["open", "chatting", "mitigating", "hotfix_pending"]);

const REOPENABLE = new Set<IncidentStatus>(["resolved", "dismissed"]);

export interface AdminIncidentActionsProps {
  incidentId: string | null;
  status?: IncidentStatus | null;
  sessionCode?: string | null;
  agent?: IncidentCodingAgentState | null;
  disabled?: boolean;
  applyMitigationFn?: typeof applyIncidentMitigation;
  publishHotfixFn?: typeof publishIncidentHotfix;
  updateStatusFn?: typeof updateIncidentStatus;
  launchCursorAgentFn?: typeof launchIncidentCursorAgent;
  openExternalUrlFn?: (url: string) => void;
}

export function AdminIncidentActions({
  incidentId,
  status = null,
  sessionCode = null,
  agent = null,
  disabled = false,
  applyMitigationFn = applyIncidentMitigation,
  publishHotfixFn = publishIncidentHotfix,
  updateStatusFn = updateIncidentStatus,
  launchCursorAgentFn = launchIncidentCursorAgent,
  openExternalUrlFn,
}: AdminIncidentActionsProps) {
  const [pending, setPending] = useState<"dismiss" | "mitigation" | "hotfix" | null>(null);

  const [mitigationType, setMitigationType] = useState<IncidentMitigationType>("soft_reload");
  const [mitigationOk, setMitigationOk] = useState<string | null>(null);

  const [toVersion, setToVersion] = useState("");
  const [graceSeconds, setGraceSeconds] = useState(String(DEFAULT_HOTFIX_GRACE_SECONDS));
  const [hotfixError, setHotfixError] = useState<string | null>(null);
  const [hotfixOk, setHotfixOk] = useState<string | null>(null);

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<string | null>(null);

  const actionsDisabled = disabled || !incidentId;
  const canClose = status != null && CLOSEABLE.has(status);
  const canReopen = status != null && REOPENABLE.has(status);

  if (pending === "dismiss" && !canClose) {
    setPending(null);
  }

  const target = sessionCode ?? "this session";
  const mitigationLabel =
    INCIDENT_MITIGATION_OPTIONS.find((option) => option.type === mitigationType)?.label ??
    mitigationType;
  const mitigationConsequence: Record<IncidentMitigationType, string> = {
    soft_reload: `Ask every player's app in ${target} to reload?`,
    reset_board: `Clear the board for ${target}? Active annotations are removed, open questions are cancelled and the timer goes back to zero.`,
    clear_pending_questions: `Cancel the open questions in ${target}?`,
    end_session: `Start the end game for ${target} now?`,
  };

  const runDismiss = async () => {
    if (!incidentId) return;
    const result = await updateStatusFn(incidentId, "dismissed");
    setStatusOk(`Status set to ${result.status}.`);
  };

  const runMitigation = async () => {
    if (!incidentId) return;
    const result = await applyMitigationFn(incidentId, mitigationType);
    setMitigationOk(`Applied ${result.type}.`);
  };

  const parsedGrace = Number.parseInt(graceSeconds, 10);
  const grace = Number.isFinite(parsedGrace) ? parsedGrace : DEFAULT_HOTFIX_GRACE_SECONDS;
  const version = toVersion.trim();

  const requestHotfix = () => {
    if (!version) {
      setHotfixError("Enter a target version.");
      return;
    }
    setHotfixError(null);
    setPending("hotfix");
  };

  const runHotfix = async () => {
    if (!incidentId) return;
    const result = await publishHotfixFn(incidentId, version, grace);
    setHotfixOk(
      `Published ${result.toVersion} (${result.graceSeconds}s grace) to ${result.fannedOutSessionCount} session(s).`,
    );
  };

  const onUpdateStatus = async (next: Extract<IncidentStatus, "resolved" | "chatting">) => {
    if (!incidentId) {
      return;
    }
    setStatusBusy(true);
    setStatusError(null);
    setStatusOk(null);
    try {
      const result = await updateStatusFn(incidentId, next);
      setStatusOk(`Status set to ${result.status}.`);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Could not update the incident status.",
      );
    }
    setStatusBusy(false);
  };

  return (
    <Stack component="aside" gap="md" aria-label="Incident actions">
      <Title order={2} size="h5">
        Actions
      </Title>

      <Stack gap="sm" pt="sm" style={{ borderTop: "1px solid var(--adm-rule)" }}>
        <Title order={3} size="h6">
          0 · Queue
        </Title>
        {statusError ? (
          <Alert data-tone="mispunch" role="alert">
            {statusError}
          </Alert>
        ) : null}
        {statusOk ? (
          <Text size="sm" c="green">
            {statusOk}
          </Text>
        ) : null}
        {canClose ? (
          <Group gap="xs" wrap="wrap">
            <Button
              type="button"
              tt="uppercase"
              disabled={actionsDisabled || statusBusy}
              onClick={() => void onUpdateStatus("resolved")}
            >
              {statusBusy ? "Updating…" : "Resolve"}
            </Button>
            <Button
              type="button"
              variant="default"
              c={toneColor.mispunch}
              tt="uppercase"
              disabled={actionsDisabled || statusBusy}
              onClick={() => setPending("dismiss")}
            >
              Dismiss
            </Button>
          </Group>
        ) : null}
        {canReopen ? (
          <Button
            type="button"
            variant="default"
            tt="uppercase"
            disabled={actionsDisabled || statusBusy}
            onClick={() => void onUpdateStatus("chatting")}
          >
            {statusBusy ? "Updating…" : "Reopen"}
          </Button>
        ) : null}
        {!canClose && !canReopen ? (
          <Text size="xs" c="dimmed">
            Select an incident to resolve, dismiss, or reopen.
          </Text>
        ) : null}
      </Stack>

      <Stack gap="sm" pt="sm" style={{ borderTop: "1px solid var(--adm-rule)" }}>
        <Title order={3} size="h6">
          1 · Apply mitigation
        </Title>
        <NativeSelect
          label="Mitigation"
          aria-label="Mitigation type"
          value={mitigationType}
          disabled={actionsDisabled}
          onChange={(event) =>
            setMitigationType(event.currentTarget.value as IncidentMitigationType)
          }
          data={INCIDENT_MITIGATION_OPTIONS.map((option) => ({
            value: option.type,
            label: option.label,
          }))}
        />
        {mitigationOk ? (
          <Text size="sm" c="green">
            {mitigationOk}
          </Text>
        ) : null}
        <Button
          type="button"
          variant="default"
          c={mitigationType === "end_session" ? toneColor.mispunch : undefined}
          tt="uppercase"
          disabled={actionsDisabled}
          onClick={() => setPending("mitigation")}
        >
          Apply mitigation
        </Button>
      </Stack>

      <AdminIncidentCursorLaunch
        key={incidentId ?? "none"}
        incidentId={incidentId}
        agent={agent}
        disabled={disabled}
        launchCursorAgentFn={launchCursorAgentFn}
        openExternalUrlFn={openExternalUrlFn}
      />

      <Stack gap="sm" pt="sm" style={{ borderTop: "1px solid var(--adm-rule)" }}>
        <Title order={3} size="h6">
          3 · Publish hotfix
        </Title>
        <TextInput
          label="Hotfix target version"
          value={toVersion}
          disabled={actionsDisabled}
          onChange={(event) => setToVersion(event.currentTarget.value)}
          placeholder={`e.g. ${APP_VERSION}.1`}
          autoComplete="off"
        />
        <TextInput
          label="Hotfix grace seconds"
          type="number"
          min={5}
          max={300}
          value={graceSeconds}
          disabled={actionsDisabled}
          onChange={(event) => setGraceSeconds(event.currentTarget.value)}
        />
        {hotfixError ? (
          <Alert data-tone="mispunch" role="alert">
            {hotfixError}
          </Alert>
        ) : null}
        {hotfixOk ? (
          <Text size="sm" c="green">
            {hotfixOk}
          </Text>
        ) : null}
        <Button
          type="button"
          variant="default"
          c={toneColor.mispunch}
          tt="uppercase"
          disabled={actionsDisabled}
          onClick={requestHotfix}
        >
          Publish hotfix
        </Button>
      </Stack>

      <AdminConfirm
        opened={pending === "dismiss"}
        title="Dismiss this incident?"
        consequence={`Dismiss the report for ${target}? It leaves the queue; you can reopen it later.`}
        confirmLabel="Dismiss incident"
        busyLabel="Dismissing…"
        destructive
        onConfirm={runDismiss}
        onClose={() => setPending(null)}
      />
      <AdminConfirm
        opened={pending === "mitigation"}
        title={`${mitigationLabel}?`}
        consequence={mitigationConsequence[mitigationType]}
        confirmLabel={`Apply ${mitigationLabel}`}
        busyLabel="Applying…"
        destructive={mitigationType === "end_session" || mitigationType === "reset_board"}
        onConfirm={runMitigation}
        onClose={() => setPending(null)}
      />
      <AdminConfirm
        opened={pending === "hotfix"}
        title="Publish hotfix?"
        consequence={`Require version ${version} in every active session? The requirement takes effect after a ${grace}s grace period.`}
        confirmLabel={`Publish ${version}`}
        busyLabel="Publishing…"
        destructive
        onConfirm={runHotfix}
        onClose={() => setPending(null)}
      />
    </Stack>
  );
}
