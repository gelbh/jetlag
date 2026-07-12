import { AdminSessionTimer } from "./AdminSessionTimer";
import { resolveAdminSessionAreaLabel } from "../../domain/admin/adminSessionAreaLabel";
import { adminSessionPhaseLabel } from "../../domain/admin/sessionPhase";
import { MotionPressable } from "../motion/MotionPressable";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

interface AdminSessionRowProps {
  summary: AdminSessionSummary;
  observingCode: string | null;
  onObserve: (summary: AdminSessionSummary) => void;
}

export function AdminSessionRow({
  summary,
  observingCode,
  onObserve,
}: AdminSessionRowProps) {
  const busy = observingCode === summary.code;
  const areaLabel = resolveAdminSessionAreaLabel(summary);

  return (
    <div className="home-card-btn home-card-btn-secondary items-start gap-3 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-[0.22em] text-ink">
            {summary.code}
          </span>
          <span className="rounded-full border border-brand-blue/40 bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            {adminSessionPhaseLabel(summary.phase)}
          </span>
        </div>
        <AdminSessionTimer summary={summary} />
        {areaLabel ? (
          <p className="text-sm text-ink">{areaLabel}</p>
        ) : null}
        <p className="text-sm text-ink-muted">
          {summary.roleCounts.seeker} seeker
          {summary.roleCounts.seeker === 1 ? "" : "s"} · {summary.roleCounts.hider}{" "}
          hider{summary.roleCounts.hider === 1 ? "" : "s"}
          {summary.roleCounts.observer > 0
            ? ` · ${summary.roleCounts.observer} observer`
            : ""}{" "}
          · {summary.tier} · {summary.gameSize}
        </p>
      </div>
      <MotionPressable
        type="button"
        className="btn-primary min-h-11 shrink-0 px-4 disabled:opacity-50"
        disabled={busy}
        aria-busy={busy}
        onClick={() => onObserve(summary)}
      >
        {busy ? "Joining…" : "Observe"}
      </MotionPressable>
    </div>
  );
}
