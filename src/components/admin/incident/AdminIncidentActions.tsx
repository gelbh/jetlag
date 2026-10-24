import { Alert, Button, Group, NativeSelect, Popover, Stack, Text, TextInput } from "@mantine/core";
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
  const [pending, setPendingState] = useState<"dismiss" | "mitigation" | "hotfix" | null>(null);
  const [menu, setMenu] = useState<"mitigate" | "hotfix" | null>(null);
  const [agentMessage, setAgentMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  // A confirm replaces the popover that asked for it.
  const setPending = (next: "dismiss" | "mitigation" | "hotfix" | null) => {
    if (next) setMenu(null);
    setPendingState(next);
  };

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

  const popoverStyles = {
    dropdown: {
      background: "var(--color-canvas)",
      border: "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)",
      borderRadius: 12,
    },
  };
  const rowButton = { h: 36, radius: 12, variant: "default" } as const;
  const messages = [
    statusError ? { tone: "error", text: statusError } : null,
    statusOk ? { tone: "ok", text: statusOk } : null,
    mitigationOk ? { tone: "ok", text: mitigationOk } : null,
    hotfixOk ? { tone: "ok", text: hotfixOk } : null,
    agentMessage,
  ].filter((message) => message != null);

  return (
    <Stack component="aside" gap={8} aria-label="Incident actions">
      <Group gap={8} wrap="wrap">
        {canClose ? (
          <Button
            type="button"
            h={36}
            radius={12}
            disabled={actionsDisabled || statusBusy}
            onClick={() => void onUpdateStatus("resolved")}
          >
            {statusBusy ? "Updating…" : "Resolve"}
          </Button>
        ) : null}
        {canReopen ? (
          <Button
            type="button"
            {...rowButton}
            disabled={actionsDisabled || statusBusy}
            onClick={() => void onUpdateStatus("chatting")}
          >
            {statusBusy ? "Updating…" : "Reopen"}
          </Button>
        ) : null}

        <Popover
          opened={menu === "mitigate"}
          onChange={(opened) => setMenu(opened ? "mitigate" : null)}
          position="bottom-start"
          width={300}
          trapFocus
          hideDetached={false}
          styles={popoverStyles}
        >
          <Popover.Target>
            <Button
              type="button"
              {...rowButton}
              disabled={actionsDisabled}
              onClick={() => setMenu(menu === "mitigate" ? null : "mitigate")}
            >
              Mitigate…
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
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
              <Button
                type="button"
                variant="default"
                c={mitigationType === "end_session" ? "var(--color-status-error)" : undefined}
                disabled={actionsDisabled}
                onClick={() => setPending("mitigation")}
              >
                Apply mitigation
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        <AdminIncidentCursorLaunch
          key={incidentId ?? "none"}
          incidentId={incidentId}
          agent={agent}
          disabled={disabled}
          launchCursorAgentFn={launchCursorAgentFn}
          openExternalUrlFn={openExternalUrlFn}
          onMessage={setAgentMessage}
        />

        <Popover
          opened={menu === "hotfix"}
          onChange={(opened) => setMenu(opened ? "hotfix" : null)}
          position="bottom-start"
          width={300}
          trapFocus
          hideDetached={false}
          styles={popoverStyles}
        >
          <Popover.Target>
            <Button
              type="button"
              {...rowButton}
              disabled={actionsDisabled}
              onClick={() => setMenu(menu === "hotfix" ? null : "hotfix")}
            >
              Hotfix…
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
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
                <Alert color="halt" role="alert">
                  {hotfixError}
                </Alert>
              ) : null}
              <Button
                type="button"
                variant="default"
                c="var(--color-status-error)"
                disabled={actionsDisabled}
                onClick={requestHotfix}
              >
                Publish hotfix
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        {canClose ? (
          <Button
            type="button"
            {...rowButton}
            c="var(--color-status-error)"
            disabled={actionsDisabled || statusBusy}
            onClick={() => setPending("dismiss")}
          >
            Dismiss…
          </Button>
        ) : null}
      </Group>

      {!canClose && !canReopen ? (
        <Text size="xs" c="var(--color-ink-muted)">
          Select an incident to resolve, dismiss, or reopen.
        </Text>
      ) : null}
      {messages.map((message) =>
        message.tone === "error" ? (
          <Alert key={message.text} color="halt" role="alert" py={6}>
            {message.text}
          </Alert>
        ) : (
          <Text key={message.text} size="sm" c="var(--color-trail)">
            {message.text}
          </Text>
        ),
      )}

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
        consequence={`Require version ${version} in every session with an active join code? The requirement takes effect after a ${grace}s grace period.`}
        confirmLabel={`Publish ${version}`}
        busyLabel="Publishing…"
        destructive
        onConfirm={runHotfix}
        onClose={() => setPending(null)}
      />
    </Stack>
  );
}
