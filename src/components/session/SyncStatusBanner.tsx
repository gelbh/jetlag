import type { SyncStatus } from "../../domain/sync";

interface SyncStatusBannerProps {
  status: SyncStatus;
  queuedWrites: number;
  message?: string | null;
}

export function SyncStatusBanner({
  status,
  queuedWrites,
  message,
}: SyncStatusBannerProps) {
  if (status === "synced" && !message) {
    return null;
  }

  const tone =
    status === "error"
      ? "border-status-error/40 bg-status-error-surface text-status-error"
      : status === "offline"
        ? "border-status-warning/40 bg-status-warning-surface text-status-warning"
        : status === "saving"
          ? "border-action/40 bg-status-info-surface text-status-info"
          : "border-border bg-surface-panel text-ink-secondary";

  const label =
    message ??
    (status === "error"
      ? "Sync failed. Changes may be queued."
      : status === "offline"
        ? queuedWrites > 0
          ? `Offline. ${queuedWrites} change${queuedWrites === 1 ? "" : "s"} queued.`
          : "Offline. Changes will queue until you reconnect."
        : status === "saving"
          ? "Saving changes…"
          : null);

  if (!label) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[var(--z-banner)] px-3">
      <div
        className={`mx-auto max-w-xl rounded-[var(--radius-hud-lg)] border px-3 py-2 text-center text-sm font-medium ${tone}`}
      >
        {label}
      </div>
    </div>
  );
}
