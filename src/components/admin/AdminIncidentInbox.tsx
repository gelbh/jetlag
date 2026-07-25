import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import {
  formatIncidentQueueId,
  incidentStatusChipLabel,
  incidentStatusChipTone,
} from "../../services/admin/adminIncidents";

export interface AdminIncidentInboxProps {
  incidents: readonly IncidentRecord[];
  selectedId: string | null;
  openCount: number;
  loading: boolean;
  error: string | null;
  onSelect: (incidentId: string) => void;
}

export function AdminIncidentInbox({
  incidents,
  selectedId,
  openCount,
  loading,
  error,
  onSelect,
}: AdminIncidentInboxProps) {
  return (
    <section className="jl-incident-queue" aria-label="Incident queue">
      <div className="jl-incident-pane-header">
        <h2 className="jl-incident-pane-title">Incident queue</h2>
        <span className="jl-incident-pane-meta">{openCount} open</span>
      </div>

      {error ? (
        <div className="jl-incident-empty" role="alert">
          <p className="jl-incident-empty-title">Queue error</p>
          <p className="jl-incident-empty-body">{error}</p>
        </div>
      ) : null}

      {loading && incidents.length === 0 && !error ? (
        <div className="jl-incident-empty" aria-busy="true">
          <p className="jl-incident-empty-title">Loading</p>
          <p className="jl-incident-empty-body">Fetching incidents…</p>
        </div>
      ) : null}

      {!loading && !error && incidents.length === 0 ? (
        <div className="jl-incident-empty">
          <p className="jl-incident-empty-title">No incidents</p>
          <p className="jl-incident-empty-body">
            Player reports appear here when submitted.
          </p>
        </div>
      ) : null}

      {incidents.length > 0 ? (
        <div className="jl-incident-queue-scroll">
          {incidents.map((incident) => {
            const tone = incidentStatusChipTone(incident.status);
            const active = selectedId === incident.id;
            return (
              <button
                key={incident.id}
                type="button"
                className={`jl-incident-queue-row${active ? " jl-incident-queue-row--active" : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(incident.id)}
              >
                <div className="jl-incident-queue-row-top">
                  <span className="jl-incident-queue-id">
                    {formatIncidentQueueId(incident.id)}
                  </span>
                  <span className={`jl-incident-chip jl-incident-chip--${tone}`}>
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
                    {formatFreshnessAge(incident.updatedAt || incident.createdAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
