import { useMemo, useState } from "react";
import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import type {
  IncidentRecord,
  IncidentStatus,
} from "../../domain/incident/incidentTypes";
import {
  formatIncidentQueueId,
  incidentStatusChipLabel,
  incidentStatusChipTone,
} from "../../services/admin/adminIncidents";
import { updateIncidentStatus } from "../../services/incident/incidentApi";

const CLOSED = new Set<IncidentStatus>(["resolved", "dismissed"]);

export interface AdminIncidentInboxProps {
  incidents: readonly IncidentRecord[];
  selectedId: string | null;
  openCount: number;
  loading: boolean;
  error: string | null;
  onSelect: (incidentId: string) => void;
  updateStatusFn?: typeof updateIncidentStatus;
}

export function AdminIncidentInbox({
  incidents,
  selectedId,
  openCount,
  loading,
  error,
  onSelect,
  updateStatusFn = updateIncidentStatus,
}: AdminIncidentInboxProps) {
  const [showClosed, setShowClosed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      showClosed
        ? incidents
        : incidents.filter((incident) => !CLOSED.has(incident.status)),
    [incidents, showClosed],
  );

  const onCloseRow = async (
    incidentId: string,
    status: Extract<IncidentStatus, "resolved" | "dismissed">,
  ) => {
    setBusyId(incidentId);
    setRowError(null);
    try {
      await updateStatusFn(incidentId, status);
    } catch (err) {
      setRowError(
        err instanceof Error ? err.message : "Could not update status.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="jl-incident-queue" aria-label="Incident queue">
      <div className="jl-incident-pane-header">
        <h2 className="jl-incident-pane-title">Incident queue</h2>
        <span className="jl-incident-pane-meta">{openCount} open</span>
      </div>

      <label className="jl-incident-queue-filter">
        <input
          type="checkbox"
          checked={showClosed}
          onChange={(event) => setShowClosed(event.target.checked)}
        />
        Show closed
      </label>

      {error ? (
        <div className="jl-incident-empty" role="alert">
          <p className="jl-incident-empty-title">Queue error</p>
          <p className="jl-incident-empty-body">{error}</p>
        </div>
      ) : null}

      {rowError ? (
        <p className="px-3 text-sm font-semibold text-status-error" role="alert">
          {rowError}
        </p>
      ) : null}

      {loading && incidents.length === 0 && !error ? (
        <div className="jl-incident-empty" aria-busy="true">
          <p className="jl-incident-empty-title">Loading</p>
          <p className="jl-incident-empty-body">Fetching incidents…</p>
        </div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="jl-incident-empty">
          <p className="jl-incident-empty-title">No incidents</p>
          <p className="jl-incident-empty-body">
            {showClosed
              ? "No reports match this filter."
              : "Player reports appear here when submitted."}
          </p>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="jl-scroll jl-incident-queue-scroll">
          {visible.map((incident) => {
            const tone = incidentStatusChipTone(incident.status);
            const active = selectedId === incident.id;
            const canClose = !CLOSED.has(incident.status);
            return (
              <div
                key={incident.id}
                className={`jl-incident-queue-row${active ? " jl-incident-queue-row--active" : ""}`}
              >
                <button
                  type="button"
                  className="jl-incident-queue-row-main"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(incident.id)}
                >
                  <div className="jl-incident-queue-row-top">
                    <span className="jl-incident-queue-id">
                      {formatIncidentQueueId(incident.id)}
                    </span>
                    <span
                      className={`jl-incident-chip jl-incident-chip--${tone}`}
                    >
                      {incidentStatusChipLabel(incident.status)}
                    </span>
                  </div>
                  <div className="jl-incident-queue-meta">
                    <span>
                      Session{" "}
                      {incident.sessionCode?.trim()
                        ? incident.sessionCode.trim().toUpperCase()
                        : "—"}
                    </span>
                    <span>
                      {formatFreshnessAge(
                        incident.updatedAt || incident.createdAt,
                      )}
                    </span>
                  </div>
                </button>
                {canClose ? (
                  <div className="jl-incident-queue-row-actions">
                    <button
                      type="button"
                      className="jl-ops-icon-btn"
                      disabled={busyId === incident.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onCloseRow(incident.id, "resolved");
                      }}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      className="jl-ops-icon-btn"
                      disabled={busyId === incident.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onCloseRow(incident.id, "dismissed");
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
