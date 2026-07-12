import type { SyncStatus } from "../../../domain/device/sync";
import {
  SYNC_TONE_CLASSES,
  syncRailDisplay,
} from "../../../components/session/status/syncRailDisplay";

interface SyncPanelProps {
  status: SyncStatus;
  queuedWrites: number;
  lastSyncError: string | null;
  remoteUpdateNotice: string | null;
}

export function SyncPanel({
  status,
  queuedWrites,
  lastSyncError,
  remoteUpdateNotice,
}: SyncPanelProps) {
  const display = syncRailDisplay(status, queuedWrites, lastSyncError);
  const tone = display.inline?.tone ?? display.banner?.tone ?? "info";
  const toneClasses = SYNC_TONE_CLASSES[tone];

  const rows: Array<{ label: string; value: string }> = [
    { label: "Status", value: status },
    { label: "Queued writes", value: String(queuedWrites) },
    {
      label: "Reachability",
      value:
        status === "offline"
          ? "Offline"
          : status === "degraded"
            ? "Unstable"
            : "OK",
    },
    { label: "Last error", value: lastSyncError ?? "—" },
    { label: "Remote notice", value: remoteUpdateNotice ?? "—" },
  ];

  return (
    <div className="space-y-4">
      {display.inline?.visible || display.banner?.visible ? (
        <p
          className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${toneClasses.text} ${toneClasses.surface} ${toneClasses.border}`}
          role="status"
        >
          {display.banner?.label ?? display.inline?.label}
        </p>
      ) : null}

      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="admin-diag-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
