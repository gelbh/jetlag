import { UnstyledButton } from "@mantine/core";
import { resolveAdminSessionAreaLabel } from "../../../domain/admin/adminSessionAreaLabel";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import { adminSessionPhaseLabel } from "../../../domain/admin/sessionPhase";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";

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
    <UnstyledButton
      type="button"
      className="jl-ops-session-row"
      aria-current={selected ? "true" : undefined}
      data-live={summary.isLive ? "true" : undefined}
      data-feedback="tap"
      disabled={monitorJoinPending}
      onClick={() => onMonitor(summary)}
    >
      <span className="jl-ops-session-body">
        <span className="jl-ops-session-head">
          <span className="jl-ops-session-code">{summary.code}</span>
          {areaLabel ? <span className="jl-ops-session-area">{areaLabel}</span> : null}
        </span>
        <span className="jl-ops-session-chips">
          {summary.isLive ? (
            <span className="jl-ops-session-chip jl-ops-session-chip--live">Live</span>
          ) : null}
          <span className="jl-ops-session-chip">{modeLabel(summary.mode)}</span>
          <span className="jl-ops-session-chip">{adminSessionPhaseLabel(summary.phase)}</span>
        </span>
        <span className="jl-ops-session-meta">
          Activity {formatFreshnessAge(summary.lastActivityAt, nowMs)} · Location{" "}
          {formatFreshnessAge(summary.lastLocationAt, nowMs)} · {summary.roleCounts.seeker}S /{" "}
          {summary.roleCounts.hider}H
          {summary.roleCounts.observer > 0
            ? ` · ${summary.roleCounts.observer} observer${summary.roleCounts.observer === 1 ? "" : "s"}`
            : ""}
          {summary.activeAnnotationCount > 0 ? ` · ${summary.activeAnnotationCount} ann` : ""}
        </span>
      </span>
      <span className="jl-ops-session-action">{joiningThisSession ? "Joining…" : "Monitor"}</span>
    </UnstyledButton>
  );
}
