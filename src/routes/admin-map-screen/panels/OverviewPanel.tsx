import type { SessionRecord } from "../../../domain/map/annotations";
import { APP_VERSION } from "../../../domain/device/changelog";
import type { TimerState } from "../../../domain/session/timer";

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

interface OverviewPanelProps {
  session: SessionRecord;
  syncStatusLabel: string;
  annotationCount: number;
  seekerCount: number;
  hiderCount: number;
  questionCount: number;
  messageCount: number;
  timerState: TimerState;
}

export function OverviewPanel({
  session,
  syncStatusLabel,
  annotationCount,
  seekerCount,
  hiderCount,
  questionCount,
  messageCount,
  timerState,
}: OverviewPanelProps) {
  const diagnosticRows: Array<{ label: string; value: string }> = [
    { label: "Session ID", value: session.id },
    { label: "Code", value: session.code ?? "—" },
    { label: "Host app version", value: session.hostAppVersion ?? "—" },
    { label: "Game size", value: session.gameSize ?? "—" },
    { label: "Tier", value: session.tier ?? "free" },
    { label: "Created", value: formatTimestamp(session.createdAt) },
    { label: "Sync", value: syncStatusLabel },
    { label: "Companion", value: APP_VERSION },
  ];

  const stats = [
    { label: "Annotations", value: String(annotationCount) },
    { label: "Seekers", value: String(seekerCount) },
    { label: "Hiders", value: String(hiderCount) },
    { label: "Questions", value: String(questionCount) },
    { label: "Messages", value: String(messageCount) },
    {
      label: "Timer",
      value:
        timerState.runningSince !== null
          ? "Running"
          : timerState.accumulatedMs > 0
            ? "Paused"
            : "Idle",
    },
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Live stats">
        <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Live stats
        </h3>
        <dl className="admin-stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="admin-stat-cell">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Session diagnostics">
        <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Diagnostics
        </h3>
        <dl className="space-y-2">
          {diagnosticRows.map((row) => (
            <div key={row.label} className="admin-diag-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
