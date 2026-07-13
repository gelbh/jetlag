import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import { resolveAdminSessionAreaLabel } from "../../domain/admin/adminSessionAreaLabel";
import { adminSessionPhaseLabel } from "../../domain/admin/sessionPhase";
import { useFreshnessClock } from "../../hooks/admin/useFreshnessClock";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

interface AdminSessionRowProps {
  summary: AdminSessionSummary;
  observingCode: string | null;
  selected?: boolean;
  onMonitor: (summary: AdminSessionSummary) => void;
}

function modeLabel(mode: AdminSessionSummary["mode"]): string {
  return mode === "multiplayer" ? "MP" : "SP";
}

export function AdminSessionRow({
  summary,
  observingCode,
  selected = false,
  onMonitor,
}: AdminSessionRowProps) {
  const nowMs = useFreshnessClock();
  const joiningThisSession = observingCode === summary.code;
  const monitorJoinPending = observingCode !== null;
  const areaLabel = resolveAdminSessionAreaLabel(summary);

  return (
    <button
      type="button"
      className={`admin-session-row admin-session-row-dense home-card-btn home-card-btn-secondary w-full items-start gap-2 px-3 py-2 text-left ${
        selected ? "ring-2 ring-brand-blue/50" : ""
      }`}
      disabled={monitorJoinPending}
      onClick={() => onMonitor(summary)}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-lg font-bold tracking-[0.18em] text-ink">
            {summary.code}
          </span>
          {areaLabel ? (
            <span className="truncate text-sm text-ink">{areaLabel}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {summary.isLive ? (
            <span className="rounded-full border border-status-success/40 bg-status-success-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-success">
              Live
            </span>
          ) : null}
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {modeLabel(summary.mode)}
          </span>
          <span className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
            {adminSessionPhaseLabel(summary.phase)}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          Activity {formatFreshnessAge(summary.lastActivityAt, nowMs)} · Location{" "}
          {formatFreshnessAge(summary.lastLocationAt, nowMs)} · {summary.roleCounts.seeker}
          S / {summary.roleCounts.hider}H
          {summary.roleCounts.observer > 0
            ? ` · ${summary.roleCounts.observer} observer${summary.roleCounts.observer === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-blue">
        {joiningThisSession ? "Joining…" : "Monitor"}
      </span>
    </button>
  );
}
