import { useState } from "react";
import type {
  IncidentMitigationType,
  IncidentStatus,
} from "../../domain/incident/incidentTypes";
import { APP_VERSION } from "../../domain/device/changelog";
import {
  DEFAULT_HOTFIX_GRACE_SECONDS,
  INCIDENT_MITIGATION_OPTIONS,
} from "../../services/admin/adminIncidents";
import {
  applyIncidentMitigation,
  publishIncidentHotfix,
  updateIncidentStatus,
} from "../../services/incident/incidentApi";

const CLOSEABLE = new Set<IncidentStatus>([
  "open",
  "chatting",
  "mitigating",
  "hotfix_pending",
]);

const REOPENABLE = new Set<IncidentStatus>(["resolved", "dismissed"]);

export interface AdminIncidentActionsProps {
  incidentId: string | null;
  status?: IncidentStatus | null;
  disabled?: boolean;
  applyMitigationFn?: typeof applyIncidentMitigation;
  publishHotfixFn?: typeof publishIncidentHotfix;
  updateStatusFn?: typeof updateIncidentStatus;
}

export function AdminIncidentActions({
  incidentId,
  status = null,
  disabled = false,
  applyMitigationFn = applyIncidentMitigation,
  publishHotfixFn = publishIncidentHotfix,
  updateStatusFn = updateIncidentStatus,
}: AdminIncidentActionsProps) {
  const [mitigationType, setMitigationType] =
    useState<IncidentMitigationType>("soft_reload");
  const [mitigationBusy, setMitigationBusy] = useState(false);
  const [mitigationError, setMitigationError] = useState<string | null>(null);
  const [mitigationOk, setMitigationOk] = useState<string | null>(null);

  const [toVersion, setToVersion] = useState("");
  const [graceSeconds, setGraceSeconds] = useState(
    String(DEFAULT_HOTFIX_GRACE_SECONDS),
  );
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
        error instanceof Error
          ? error.message
          : "Could not apply the mitigation.",
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
    const grace = Number.isFinite(parsedGrace)
      ? parsedGrace
      : DEFAULT_HOTFIX_GRACE_SECONDS;

    setHotfixBusy(true);
    setHotfixError(null);
    setHotfixOk(null);
    try {
      const result = await publishHotfixFn(incidentId, version, grace);
      setHotfixOk(
        `Published ${result.toVersion} (${result.graceSeconds}s grace) to ${result.fannedOutSessionCount} session(s).`,
      );
    } catch (error) {
      setHotfixError(
        error instanceof Error
          ? error.message
          : "Could not publish the hotfix.",
      );
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
        error instanceof Error
          ? error.message
          : "Could not update the incident status.",
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

      <div className="jl-incident-module">
        <h3 className="jl-incident-module-title">0 · Queue</h3>
        {statusError ? (
          <p className="text-sm font-semibold text-status-error" role="alert">
            {statusError}
          </p>
        ) : null}
        {statusOk ? (
          <p className="text-sm text-status-success">{statusOk}</p>
        ) : null}
        {canClose ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary uppercase"
              disabled={actionsDisabled || statusBusy}
              onClick={() => void onUpdateStatus("resolved")}
            >
              {statusBusy ? "Updating…" : "Resolve"}
            </button>
            <button
              type="button"
              className="btn-secondary uppercase"
              disabled={actionsDisabled || statusBusy}
              onClick={() => void onUpdateStatus("dismissed")}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {canReopen ? (
          <button
            type="button"
            className="btn-primary uppercase"
            disabled={actionsDisabled || statusBusy}
            onClick={() => void onUpdateStatus("chatting")}
          >
            {statusBusy ? "Updating…" : "Reopen"}
          </button>
        ) : null}
        {!canClose && !canReopen ? (
          <p className="jl-incident-module-hint">
            Select an incident to resolve, dismiss, or reopen.
          </p>
        ) : null}
      </div>

      <div className="jl-incident-module">
        <h3 className="jl-incident-module-title">1 · Apply mitigation</h3>
        <div>
          <p className="jl-incident-module-label">Mitigation</p>
          <select
            className="field-input"
            value={mitigationType}
            disabled={actionsDisabled || mitigationBusy}
            onChange={(event) =>
              setMitigationType(event.target.value as IncidentMitigationType)
            }
            aria-label="Mitigation type"
          >
            {INCIDENT_MITIGATION_OPTIONS.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {mitigationError ? (
          <p className="text-sm font-semibold text-status-error" role="alert">
            {mitigationError}
          </p>
        ) : null}
        {mitigationOk ? (
          <p className="text-sm text-status-success">{mitigationOk}</p>
        ) : null}
        <button
          type="button"
          className="btn-primary uppercase"
          disabled={actionsDisabled || mitigationBusy}
          onClick={() => void onApplyMitigation()}
        >
          {mitigationBusy ? "Applying…" : "Apply mitigation"}
        </button>
      </div>

      <div className="jl-incident-module">
        <h3 className="jl-incident-module-title">2 · Launch Cursor agent</h3>
        <p className="jl-incident-module-hint">
          Coming in follow-up — session-ops agent is not available in v1.
        </p>
        <button
          type="button"
          className="btn-secondary uppercase"
          disabled
          aria-disabled="true"
          title="Coming in follow-up"
        >
          Launch Cursor agent
        </button>
      </div>

      <div className="jl-incident-module">
        <h3 className="jl-incident-module-title">3 · Publish hotfix</h3>
        <div>
          <p className="jl-incident-module-label">Target version</p>
          <input
            className="field-input"
            value={toVersion}
            disabled={actionsDisabled || hotfixBusy}
            onChange={(event) => setToVersion(event.target.value)}
            placeholder={`e.g. ${APP_VERSION}.1`}
            aria-label="Hotfix target version"
            autoComplete="off"
          />
        </div>
        <div>
          <p className="jl-incident-module-label">Grace seconds</p>
          <input
            className="field-input"
            type="number"
            min={5}
            max={300}
            value={graceSeconds}
            disabled={actionsDisabled || hotfixBusy}
            onChange={(event) => setGraceSeconds(event.target.value)}
            aria-label="Hotfix grace seconds"
          />
        </div>
        {hotfixError ? (
          <p className="text-sm font-semibold text-status-error" role="alert">
            {hotfixError}
          </p>
        ) : null}
        {hotfixOk ? (
          <p className="text-sm text-status-success">{hotfixOk}</p>
        ) : null}
        <button
          type="button"
          className="btn-primary uppercase"
          disabled={actionsDisabled || hotfixBusy}
          onClick={() => void onPublishHotfix()}
        >
          {hotfixBusy ? "Publishing…" : "Publish hotfix"}
        </button>
      </div>
    </aside>
  );
}
