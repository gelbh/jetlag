import { Button, Group } from "@mantine/core";
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
  /** Outcome line for the actions row to show (launch result or error). */
  onMessage?: (message: { tone: "ok" | "error"; text: string } | null) => void;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Launch / Open / Retry Cursor coding agent; one button in the actions row.
 * Parent should pass `key={incidentId}` so local state resets on selection change.
 */
export function AdminIncidentCursorLaunch({
  incidentId,
  agent = null,
  disabled = false,
  launchCursorAgentFn = launchIncidentCursorAgent,
  openExternalUrlFn = openInNewTab,
  onMessage,
}: AdminIncidentCursorLaunchProps) {
  const [busy, setBusy] = useState(false);
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
    onMessage?.(null);
    try {
      const result = await launchCursorAgentFn(incidentId);
      setLocalAgent({
        status: "launched",
        cursorAgentId: result.agentId ?? null,
        cursorAgentUrl: result.agentUrl ?? null,
        cursorRunId: result.runId ?? null,
        forced: true,
      });
      onMessage?.({
        tone: "ok",
        text: result.agentUrl
          ? "Cursor agent launched."
          : "Cursor agent launched (no URL returned).",
      });
    } catch (err) {
      onMessage?.({
        tone: "error",
        text: err instanceof Error ? err.message : "Could not launch the Cursor agent.",
      });
    }
    setBusy(false);
  };

  const hint = codingAgentHint(effectiveAgent);

  if (hasOpenableAgent) {
    return (
      <Button
        type="button"
        variant="default"
        h={36}
        radius={12}
        title={hint}
        disabled={actionsDisabled}
        onClick={() => {
          if (agentUrl) {
            openExternalUrlFn(agentUrl);
          }
        }}
      >
        Open agent
      </Button>
    );
  }

  if (waitingForLink) {
    return (
      <Group gap={4} wrap="nowrap">
        <Button type="button" variant="default" h={36} radius={12} title={hint} disabled>
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
    );
  }

  return (
    <Button
      type="button"
      variant="default"
      h={36}
      radius={12}
      title={hint}
      disabled={actionsDisabled || busy}
      onClick={() => void onLaunch()}
    >
      {busy ? "Launching…" : failed ? "Retry launch" : "Launch agent"}
    </Button>
  );
}
