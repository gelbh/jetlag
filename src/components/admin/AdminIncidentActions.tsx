import { Alert, Button, Group, NativeSelect, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { APP_VERSION } from "../../domain/device/changelog";
import type {
  IncidentCodingAgentState,
  IncidentMitigationType,
  IncidentStatus,
} from "../../domain/incident/incidentTypes";
import {
  DEFAULT_HOTFIX_GRACE_SECONDS,
  INCIDENT_MITIGATION_OPTIONS,
} from "../../services/admin/adminIncidents";
import {
  applyIncidentMitigation,
  launchIncidentCursorAgent,
  publishIncidentHotfix,
  updateIncidentStatus,
} from "../../services/incident/incidentApi";
import { AdminIncidentCursorLaunch } from "./AdminIncidentCursorLaunch";

const CLOSEABLE = new Set<IncidentStatus>(["open", "chatting", "mitigating", "hotfix_pending"]);

const REOPENABLE = new Set<IncidentStatus>(["resolved", "dismissed"]);

export interface AdminIncidentActionsProps {
  incidentId: string | null;
  status?: IncidentStatus | null;
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
  agent = null,
  disabled = false,
  applyMitigationFn = applyIncidentMitigation,
  publishHotfixFn = publishIncidentHotfix,
  updateStatusFn = updateIncidentStatus,
  launchCursorAgentFn = launchIncidentCursorAgent,
  openExternalUrlFn,
}: AdminIncidentActionsProps) {
  const [mitigationType, setMitigationType] = useState<IncidentMitigationType>("soft_reload");
  const [mitigationBusy, setMitigationBusy] = useState(false);
  const [mitigationError, setMitigationError] = useState<string | null>(null);
  const [mitigationOk, setMitigationOk] = useState<string | null>(null);

  const [toVersion, setToVersion] = useState("");
  const [graceSeconds, setGraceSeconds] = useState(String(DEFAULT_HOTFIX_GRACE_SECONDS));
  const [hotfixBusy, setHotfixBusy] = useState(false);
  const [hotfixError, setHotfixError] = useState<string | null>(null);
  const [hotfixOk, setHotfixOk] = useState<string | null>(null);

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<string | null>(null);

  const actionsDisabled = disabled || !incidentId;
  const canClose = status != null && CLOSEABLE.has(status);
  const canReopen = status != null && REOPENABLE.has(status);

  const onApplyMitigation = async () => {
    if (!incidentId) {
      return;
    }
    setMitigationBusy(true);
    setMitigationError(null);
    setMitigationOk(null);
    try {
      const result = await applyMitigationFn(incidentId, mitigationType);
      setMitigationOk(`Applied ${result.type}.`);
    } catch (error) {
      setMitigationError(
        error instanceof Error ? error.message : "Could not apply the mitigation.",
      );
    } finally {
      setMitigationBusy(false);
    }
  };

  const onPublishHotfix = async () => {
    if (!incidentId) {
      return;
    }
    const version = toVersion.trim();
    if (!version) {
      setHotfixError("Enter a target version.");
      return;
    }
    const parsedGrace = Number.parseInt(graceSeconds, 10);
    const grace = Number.isFinite(parsedGrace) ? parsedGrace : DEFAULT_HOTFIX_GRACE_SECONDS;

    setHotfixBusy(true);
    setHotfixError(null);
    setHotfixOk(null);
    try {
      const result = await publishHotfixFn(incidentId, version, grace);
      setHotfixOk(
        `Published ${result.toVersion} (${result.graceSeconds}s grace) to ${result.fannedOutSessionCount} session(s).`,
      );
    } catch (error) {
      setHotfixError(error instanceof Error ? error.message : "Could not publish the hotfix.");
    } finally {
      setHotfixBusy(false);
    }
  };

  const onUpdateStatus = async (
    next: Extract<IncidentStatus, "resolved" | "dismissed" | "chatting">,
  ) => {
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
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <aside className="jl-scroll jl-incident-actions" aria-label="Incident actions">
      <div className="jl-incident-pane-header">
        <h2 className="jl-incident-pane-title">Actions</h2>
      </div>

      <Stack className="jl-incident-module" gap="sm">
        <h3 className="jl-incident-module-title">0 · Queue</h3>
        {statusError ? (
          <Alert color="red" role="alert">
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
              tt="uppercase"
              disabled={actionsDisabled || statusBusy}
              onClick={() => void onUpdateStatus("dismissed")}
            >
              Dismiss
            </Button>
          </Group>
        ) : null}
        {canReopen ? (
          <Button
            type="button"
            tt="uppercase"
            disabled={actionsDisabled || statusBusy}
            onClick={() => void onUpdateStatus("chatting")}
          >
            {statusBusy ? "Updating…" : "Reopen"}
          </Button>
        ) : null}
        {!canClose && !canReopen ? (
          <p className="jl-incident-module-hint">
            Select an incident to resolve, dismiss, or reopen.
          </p>
        ) : null}
      </Stack>

      <Stack className="jl-incident-module" gap="sm">
        <h3 className="jl-incident-module-title">1 · Apply mitigation</h3>
        <NativeSelect
          label="Mitigation"
          aria-label="Mitigation type"
          value={mitigationType}
          disabled={actionsDisabled || mitigationBusy}
          onChange={(event) =>
            setMitigationType(event.currentTarget.value as IncidentMitigationType)
          }
          data={INCIDENT_MITIGATION_OPTIONS.map((option) => ({
            value: option.type,
            label: option.label,
          }))}
        />
        {mitigationError ? (
          <Alert color="red" role="alert">
            {mitigationError}
          </Alert>
        ) : null}
        {mitigationOk ? (
          <Text size="sm" c="green">
            {mitigationOk}
          </Text>
        ) : null}
        <Button
          type="button"
          tt="uppercase"
          disabled={actionsDisabled || mitigationBusy}
          onClick={() => void onApplyMitigation()}
        >
          {mitigationBusy ? "Applying…" : "Apply mitigation"}
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

      <Stack className="jl-incident-module" gap="sm">
        <h3 className="jl-incident-module-title">3 · Publish hotfix</h3>
        <TextInput
          label="Hotfix target version"
          value={toVersion}
          disabled={actionsDisabled || hotfixBusy}
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
          disabled={actionsDisabled || hotfixBusy}
          onChange={(event) => setGraceSeconds(event.currentTarget.value)}
        />
        {hotfixError ? (
          <Alert color="red" role="alert">
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
          tt="uppercase"
          disabled={actionsDisabled || hotfixBusy}
          onClick={() => void onPublishHotfix()}
        >
          {hotfixBusy ? "Publishing…" : "Publish hotfix"}
        </Button>
      </Stack>
    </aside>
  );
}
