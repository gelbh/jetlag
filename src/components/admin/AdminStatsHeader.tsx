import { summarizeAdminSessions } from "../../domain/admin/adminSessionFilters";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

export function AdminStatsHeader({
  sessions,
}: {
  sessions: readonly AdminSessionSummary[];
}) {
  const stats = summarizeAdminSessions(sessions);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard label="Live" value={String(stats.live)} />
      <StatCard label="Multiplayer" value={String(stats.multiplayer)} />
      <StatCard label="Seeking" value={String(stats.byPhase.seek)} />
      <StatCard label="End game" value={String(stats.byPhase["end-game-active"])} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-panel px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
