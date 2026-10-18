import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import type { IncidentCodingAgentState } from "../../../domain/incident/incidentTypes";
import {
  type LaunchIncidentCursorAgentResult,
  launchIncidentCursorAgent,
} from "../../../services/incident/incidentApi";

function codingAgentHint(agent: IncidentCodingAgentState | null | undefined): string {
  if (!agent) {
    return "Force-launch a Cursor coding agent into the private hotfix thread.";
  }
  switch (agent.status) {
    case "launched":
      return agent.forced ? "Cursor agent launched (admin force)." : "Cursor agent launched.";
    case "failed":
      return "Last launch failed - retry when ready.";
    case "misconfigured":
      return "Cursor API is not configured - fix the secret, then retry.";
    default: {
      const _exhaustive: never = agent.status;
      return _exhaustive;
    }
  }
}

export interface AdminIncidentCursorLaunchProps {
  incidentId: string | null;
  agent?: IncidentCodingAgentState | null;
  disabled?: boolean;
  launchCursorAgentFn?: (incidentId: string) => Promise<LaunchIncidentCursorAgentResult>;
  openExternalUrlFn?: (url: string) => void;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Actions module 2 - Launch / Open / Retry Cursor coding agent.
 * Parent should pass `key={incidentId}` so local state resets on selection change.
 */
export function AdminIncidentCursorLaunch({
  incidentId,
  agent = null,
  disabled = false,
  launchCursorAgentFn = launchIncidentCursorAgent,
  openExternalUrlFn = openInNewTab,
}: AdminIncidentCursorLaunchProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [localAgent, setLocalAgent] = useState<IncidentCodingAgentState | null>(null);

  const effectiveAgent = agent?.cursorAgentId ? agent : (localAgent ?? agent);
  const actionsDisabled = disabled || !incidentId;
  const agentUrl =
    typeof effectiveAgent?.cursorAgentUrl === "string" && effectiveAgent.cursorAgentUrl.trim()
      ? effectiveAgent.cursorAgentUrl.trim()
      : null;
  const hasOpenableAgent = Boolean(effectiveAgent?.cursorAgentId && agentUrl);
  const failed = effectiveAgent?.status === "failed" || effectiveAgent?.status === "misconfigured";
  const waitingForLink = Boolean(effectiveAgent?.cursorAgentId && !agentUrl && !failed);

  const onLaunch = async () => {
    if (!incidentId) {
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const result = await launchCursorAgentFn(incidentId);
      setLocalAgent({
        status: "launched",
        cursorAgentId: result.agentId ?? null,
        cursorAgentUrl: result.agentUrl ?? null,
        cursorRunId: result.runId ?? null,
        forced: true,
      });
      setOk(
        result.agentUrl ? "Cursor agent launched." : "Cursor agent launched (no URL returned).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch the Cursor agent.");
    }
    setBusy(false);
  };

  return (
    <Stack gap="sm" pt="sm" style={{ borderTop: "1px solid var(--adm-rule)" }}>
      <Title order={3} size="h6">
        2 · Coding agent
      </Title>
      <Text size="xs" c="dimmed">
        {codingAgentHint(effectiveAgent)}
      </Text>
      {error ? (
        <Alert data-tone="mispunch" role="alert">
          {error}
        </Alert>
      ) : null}
      {ok ? (
        <Text size="sm" c="green">
          {ok}
        </Text>
      ) : null}
      {hasOpenableAgent ? (
        <Button
          type="button"
          variant="default"
          tt="uppercase"
          disabled={actionsDisabled}
          onClick={() => {
            if (agentUrl) {
              openExternalUrlFn(agentUrl);
            }
          }}
        >
          Open agent
        </Button>
      ) : waitingForLink ? (
        <Group gap="xs" wrap="nowrap">
          <Button type="button" variant="default" tt="uppercase" disabled>
            Agent launched, waiting for link
          </Button>
          <Button
            type="button"
            variant="subtle"
            size="compact-sm"
            disabled={actionsDisabled || busy}
            onClick={() => void onLaunch()}
          >
            {busy ? "Launching…" : "Retry"}
          </Button>
        </Group>
      ) : (
        <Button
          type="button"
          variant="default"
          tt="uppercase"
          disabled={actionsDisabled || busy}
          onClick={() => void onLaunch()}
        >
          {busy ? "Launching…" : failed ? "Retry launch" : "Launch agent"}
        </Button>
      )}
    </Stack>
  );
}
