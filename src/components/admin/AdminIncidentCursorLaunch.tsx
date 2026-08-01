import { useEffect, useRef, useState } from "react";
import type { IncidentCodingAgentState } from "../../domain/incident/incidentTypes";
import {
  launchIncidentCursorAgent,
  type LaunchIncidentCursorAgentResult,
} from "../../services/incident/incidentApi";

function codingAgentHint(
  agent: IncidentCodingAgentState | null | undefined,
): string {
  if (!agent) {
    return "Force-launch a Cursor coding agent into the private hotfix thread.";
  }
  switch (agent.status) {
    case "launched":
      return agent.forced
        ? "Cursor agent launched (admin force)."
        : "Cursor agent launched.";
    case "failed":
      return "Last launch failed — retry when ready.";
    case "misconfigured":
      return "Cursor API is not configured — fix the secret, then retry.";
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
  launchCursorAgentFn?: (
    incidentId: string,
  ) => Promise<LaunchIncidentCursorAgentResult>;
  openExternalUrlFn?: (url: string) => void;
}

/**
 * Actions module 2 — Launch / Open / Retry Cursor coding agent.
 */
export function AdminIncidentCursorLaunch({
  incidentId,
  agent = null,
  disabled = false,
  launchCursorAgentFn = launchIncidentCursorAgent,
  openExternalUrlFn = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  },
}: AdminIncidentCursorLaunchProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [localAgent, setLocalAgent] = useState<IncidentCodingAgentState | null>(
    null,
  );
  const launchGenerationRef = useRef(0);

  useEffect(() => {
    launchGenerationRef.current += 1;
    setLocalAgent(null);
    setError(null);
    setOk(null);
    setBusy(false);
  }, [incidentId]);

  useEffect(() => {
    if (agent?.cursorAgentId) {
      setLocalAgent(null);
    }
  }, [agent?.cursorAgentId]);

  const effectiveAgent = localAgent ?? agent;
  const actionsDisabled = disabled || !incidentId;
  const agentUrl =
    typeof effectiveAgent?.cursorAgentUrl === "string" &&
    effectiveAgent.cursorAgentUrl.trim()
      ? effectiveAgent.cursorAgentUrl.trim()
      : null;
  const hasOpenableAgent = Boolean(
    effectiveAgent?.cursorAgentId && agentUrl,
  );
  const canRetry =
    effectiveAgent?.status === "failed" ||
    effectiveAgent?.status === "misconfigured" ||
    Boolean(effectiveAgent?.cursorAgentId && !agentUrl);

  const onLaunch = async () => {
    if (!incidentId) {
      return;
    }
    const generation = launchGenerationRef.current;
    const launchedForId = incidentId;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const result = await launchCursorAgentFn(launchedForId);
      if (
        generation !== launchGenerationRef.current ||
        launchedForId !== incidentId
      ) {
        return;
      }
      setLocalAgent({
        status: "launched",
        cursorAgentId: result.agentId ?? null,
        cursorAgentUrl: result.agentUrl ?? null,
        cursorRunId: result.runId ?? null,
        forced: true,
      });
      setOk(
        result.agentUrl
          ? "Cursor agent launched."
          : "Cursor agent launched (no URL returned).",
      );
    } catch (err) {
      if (
        generation !== launchGenerationRef.current ||
        launchedForId !== incidentId
      ) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Could not launch the Cursor agent.",
      );
    } finally {
      if (generation === launchGenerationRef.current) {
        setBusy(false);
      }
    }
  };

  return (
    <div className="jl-incident-module">
      <h3 className="jl-incident-module-title">2 · Launch Cursor agent</h3>
      <p className="jl-incident-module-hint">{codingAgentHint(effectiveAgent)}</p>
      {error ? (
        <p className="text-sm font-semibold text-status-error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-status-success">{ok}</p> : null}
      {hasOpenableAgent ? (
        <button
          type="button"
          className="btn-secondary uppercase"
          disabled={actionsDisabled}
          onClick={() => {
            if (agentUrl) {
              openExternalUrlFn(agentUrl);
            }
          }}
        >
          Open Cursor agent
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn-secondary uppercase"
            disabled={actionsDisabled || busy}
            onClick={() => void onLaunch()}
          >
            {busy
              ? "Launching…"
              : canRetry
                ? "Retry launch"
                : "Launch Cursor agent"}
          </button>
          {effectiveAgent?.cursorAgentId && !agentUrl ? (
            <p className="jl-incident-module-hint">
              Agent id is set but no URL was returned — retry or check the
              hotfix thread.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
